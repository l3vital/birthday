/**
 * Клиентская логика для приглашения на 60-летний Юбилей (Хвангап)
 * Включает:
 * - Звуковое ядро (фоновая музыка + процедурный Web Audio API синтез звуков клика и перезвона)
 * - 3D Parallax и гироскоп (iPhone / Samsung / Desktop)
 * - Каскад золотых лепестков пиона и искр
 * - Таймер обратного отсчета
 * - Отправку ответов RSVP в Google Таблицу (Лист "Юбилей") и Telegram-бот
 * - Сохранение в LocalStorage и возможность редактирования ответа до дедлайна
 */

// --- КОНФИГУРАЦИЯ ---
const CONFIG = {
  // Дата мероприятия в формате YYYY-MM-DD
  EVENT_DATE: '2027-02-27',
  EVENT_TIME: '17:00:00',
  
  // Дата дедлайна для изменения ответа
  DEADLINE_DATE: '2027-02-01',
  
  // URL веб-приложения Google Apps Script
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwRTD_0ucyHR6S-_TG6Ca_Z509DdXy6GoOuU_A0Fy0G2C3bVGOnZJQehdWZbUP0Ta44HQ/exec',
  
  // Фоновая музыка (локальный файл MP3 с максимальной совместимостью)
  BG_MUSIC_URL: 'high.mp3'
};

// --- СОСТОЯНИЕ АУДИО ---
let audioCtx = null;
let bgMusic = null;
let isMusicPlaying = false;
let userInteractedWithMusic = false;

// --- ПРОЦЕДУРНЫЙ СИНТЕЗАТОР ЗВУКОВ (WEB AUDIO API) ---
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Мягкий тактильный щелчок при нажатии на сургуч/кнопки
function playClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  } catch (e) {
    console.warn('Click sound failed:', e);
  }
}

// Праздничный перезвон колокольчиков при успешной отправке RSVP
function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Традиционный праздничный пентатонический аккорд
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const time = ctx.currentTime + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.14, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc.start(time);
      osc.stop(time + 0.35);
    });
  } catch (e) {
    console.warn('Success chime failed:', e);
  }
}

// --- УПРАВЛЕНИЕ МУЗЫКОЙ ---
function setupAudio() {
  const musicToggle = document.getElementById('musicToggle');
  const bgAudioEl = document.getElementById('bgMusic');
  
  if (bgAudioEl) {
    bgMusic = bgAudioEl;
    bgMusic.volume = 0.45;
  } else {
    bgMusic = new Audio(CONFIG.BG_MUSIC_URL);
    bgMusic.loop = true;
    bgMusic.volume = 0.45;
  }

  // Однократный разблокировщик для iOS Safari при первом жесте
  const unlockAudioOnGesture = () => {
    getAudioContext();
    if (bgMusic && !isMusicPlaying) {
      try { bgMusic.load(); } catch (e) {}
    }
    document.removeEventListener('touchstart', unlockAudioOnGesture);
    document.removeEventListener('click', unlockAudioOnGesture);
  };
  document.addEventListener('touchstart', unlockAudioOnGesture, { passive: true });
  document.addEventListener('click', unlockAudioOnGesture);

  if (musicToggle) {
    musicToggle.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      userInteractedWithMusic = true;
      getAudioContext();
      toggleAudio();
    };
  }
}

function toggleAudio() {
  userInteractedWithMusic = true;
  const iconOn = document.getElementById('musicIconOn');
  const iconOff = document.getElementById('musicIconOff');

  if (!bgMusic) {
    const bgAudioEl = document.getElementById('bgMusic');
    if (bgAudioEl) {
      bgMusic = bgAudioEl;
      bgMusic.volume = 0.45;
    }
  }

  getAudioContext();

  if (!bgMusic) return;

  // Проверяем реальное состояние аудио элемента
  const isCurrentlyPlaying = !bgMusic.paused && bgMusic.currentTime > 0;

  if (isCurrentlyPlaying) {
    bgMusic.pause();
    isMusicPlaying = false;
    if (iconOn) iconOn.classList.add('hidden');
    if (iconOff) iconOff.classList.remove('hidden');
  } else {
    bgMusic.play().then(() => {
      isMusicPlaying = true;
      if (iconOn) iconOn.classList.remove('hidden');
      if (iconOff) iconOff.classList.add('hidden');
    }).catch(err => {
      console.log('Audio autoplay prevented:', err);
    });
  }
}

function startMusicOnOpen() {
  if (userInteractedWithMusic && !isMusicPlaying) return;
  getAudioContext();
  if (bgMusic && !isMusicPlaying) {
    bgMusic.play().then(() => {
      isMusicPlaying = true;
      const iconOn = document.getElementById('musicIconOn');
      const iconOff = document.getElementById('musicIconOff');
      if (iconOn) iconOn.classList.remove('hidden');
      if (iconOff) iconOff.classList.add('hidden');
    }).catch(err => {
      console.log('Auto music start restricted:', err);
    });
  }
}

// --- ТАЙМЕР ОБРАТНОГО ОТСЧЕТА ---
function updateCountdown() {
  const targetDate = new Date(`${CONFIG.EVENT_DATE}T${CONFIG.EVENT_TIME}`).getTime();
  const now = new Date().getTime();
  const diff = targetDate - now;

  const daysEl = document.getElementById('timer-days');
  const hoursEl = document.getElementById('timer-hours');
  const minutesEl = document.getElementById('timer-minutes');
  const secondsEl = document.getElementById('timer-seconds');

  if (!daysEl) return;

  if (diff > 0) {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    daysEl.innerText = String(days).padStart(2, '0');
    hoursEl.innerText = String(hours).padStart(2, '0');
    minutesEl.innerText = String(minutes).padStart(2, '0');
    secondsEl.innerText = String(seconds).padStart(2, '0');
  } else {
    daysEl.innerText = '00';
    hoursEl.innerText = '00';
    minutesEl.innerText = '00';
    secondsEl.innerText = '00';
  }
}

// --- КАСКАД ЗОЛОТЫХ ЛЕПЕСТКОВ ПИОНА И ИСКР (60 FPS АППАРАТНОЕ УСКОРЕНИЕ) ---
function spawnPeonyPetalBurst() {
  const container = document.createElement('div');
  container.className = 'fixed inset-0 pointer-events-none z-[150] overflow-hidden';
  document.body.appendChild(container);

  // Используем DocumentFragment для пакетной вставки всех элементов за 1 reflow
  const fragment = document.createDocumentFragment();

  const petalImages = [
    'images/petal_gold_large.png',
    'images/petal_gold_medium.png',
    'images/petal_gold_small.png'
  ];

  const envelopeEl = document.getElementById('envelopeCard');
  const rect = envelopeEl ? envelopeEl.getBoundingClientRect() : {
    left: window.innerWidth / 2 - 140,
    top: window.innerHeight * 0.25,
    width: 280,
    height: 420
  };

  const envelopeCenterX = rect.left + rect.width / 2;
  const envelopeCenterY = rect.top + rect.height / 2;

  // Адаптивное количество частиц: на смартфонах оптимизируем для стабильных 60 FPS
  const isMobile = window.innerWidth < 768;
  const petalCount = isMobile ? 22 : 34;
  const sparkCount = isMobile ? 28 : 45;

  // 1. Создаем лепестки пиона
  for (let i = 0; i < petalCount; i++) {
    const petal = document.createElement('img');
    petal.src = petalImages[i % petalImages.length];
    petal.className = 'absolute select-none pointer-events-none';
    
    const size = Math.floor(Math.random() * 24) + 24; // 24px - 48px
    petal.style.width = `${size}px`;
    petal.style.height = 'auto';

    const startX = rect.left + (Math.random() * 0.84 + 0.08) * rect.width;
    const startY = rect.top + (Math.random() * 0.84 + 0.08) * rect.height;

    // Центрирование через margin для исключения медленных calc() внутри keyframes
    petal.style.left = `${startX}px`;
    petal.style.top = `${startY}px`;
    petal.style.marginLeft = `${-size / 2}px`;
    petal.style.marginTop = `${-size / 2}px`;
    
    // Одиночная аппаратная тень без двойного размытия
    petal.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.65))';
    petal.style.opacity = '0';
    petal.style.willChange = 'transform, opacity';
    petal.style.transform = 'translate3d(0, 0, 0) scale(0.35)';

    fragment.appendChild(petal);

    const outwardSpread = (startX - envelopeCenterX) * 0.85;
    const upwardAngle = -Math.PI * (0.10 + Math.random() * 0.80);
    const blastPower = Math.random() * 230 + 180;
    const peakX = outwardSpread + Math.cos(upwardAngle) * (blastPower * 0.8);
    const peakY = Math.sin(upwardAngle) * blastPower - 25;

    const rotSpeed = (Math.random() - 0.5) * 600;
    const duration = Math.random() * 1.6 + 4.4;
    const delay = (i % 6) * 0.06 + Math.random() * 0.2;
    const swayFreq = i * 1.5;

    // Чистый translate3d без calc() гарантирует 60 FPS на GPU compositor thread
    petal.animate([
      {
        transform: 'translate3d(0, 0, 0) scale(0.35) rotate(0deg)',
        opacity: 0,
        offset: 0
      },
      {
        transform: `translate3d(${peakX * 0.45}px, ${peakY * 0.55}px, 0) scale(0.9) rotate(${rotSpeed * 0.15}deg)`,
        opacity: 0.92,
        offset: 0.18
      },
      {
        transform: `translate3d(${peakX}px, ${peakY}px, 0) scale(1.05) rotate(${rotSpeed * 0.35}deg)`,
        opacity: 1,
        offset: 0.36
      },
      {
        transform: `translate3d(${peakX * 1.2 + Math.sin(swayFreq) * 50}px, ${peakY + 420}px, 0) scale(0.95) rotate(${rotSpeed * 0.7}deg)`,
        opacity: 0.95,
        offset: 0.68
      },
      {
        transform: `translate3d(${peakX * 1.4 + Math.cos(swayFreq) * 80}px, ${peakY + 950}px, 0) scale(0.8) rotate(${rotSpeed}deg)`,
        opacity: 0,
        offset: 1
      }
    ], {
      duration: duration * 1000,
      delay: delay * 1000,
      easing: 'cubic-bezier(0.25, 0.9, 0.35, 1)',
      fill: 'forwards'
    });
  }

  // 2. Создаем золотые искры
  for (let i = 0; i < sparkCount; i++) {
    const spark = document.createElement('div');
    const sparkSize = Math.floor(Math.random() * 5) + 3;
    spark.className = 'absolute rounded-full pointer-events-none';
    spark.style.width = `${sparkSize}px`;
    spark.style.height = `${sparkSize}px`;

    const startX = rect.left + Math.random() * rect.width;
    const startY = rect.top + Math.random() * rect.height;

    spark.style.left = `${startX}px`;
    spark.style.top = `${startY}px`;
    spark.style.marginLeft = `${-sparkSize / 2}px`;
    spark.style.marginTop = `${-sparkSize / 2}px`;
    spark.style.background = 'radial-gradient(circle, #FFFFFF 0%, #FFF4D0 40%, #DFB254 80%, transparent 100%)';
    spark.style.boxShadow = '0 0 8px rgba(223, 178, 84, 0.9), 0 0 16px rgba(223, 178, 84, 0.5)';
    spark.style.willChange = 'transform, opacity';
    spark.style.transform = 'translate3d(0, 0, 0) scale(0.3)';

    fragment.appendChild(spark);

    const outwardSpread = (startX - envelopeCenterX) * 0.8;
    const upwardAngle = -Math.PI * (0.05 + Math.random() * 0.9);
    const blastPower = Math.random() * 260 + 120;
    const targetX = outwardSpread + Math.cos(upwardAngle) * (blastPower * 0.8);
    const targetY = Math.sin(upwardAngle) * blastPower;
    const duration = Math.random() * 1.4 + 2.6;
    const delay = Math.random() * 0.22;

    spark.animate([
      {
        transform: 'translate3d(0, 0, 0) scale(0.3)',
        opacity: 0,
        offset: 0
      },
      {
        transform: `translate3d(${targetX * 0.7}px, ${targetY * 0.8}px, 0) scale(1.4)`,
        opacity: 1,
        offset: 0.30
      },
      {
        transform: `translate3d(${targetX * 1.15}px, ${targetY + 420}px, 0) scale(0.2)`,
        opacity: 0,
        offset: 1
      }
    ], {
      duration: duration * 1000,
      delay: delay * 1000,
      easing: 'cubic-bezier(0.2, 0.85, 0.35, 1)',
      fill: 'forwards'
    });
  }

  // Вставляем все частицы в DOM за 1 операцию
  container.appendChild(fragment);

  setTimeout(() => {
    container.remove();
  }, 6500);
}

// --- ОТКРЫТИЕ КОНВЕРТА ---
let isEnvelopeOpened = false;

function openEnvelope() {
  if (isEnvelopeOpened) return;
  isEnvelopeOpened = true;

  try { playClickSound(); } catch (e) {}
  try { requestSensorsPermission(); } catch (e) {}
  try { startMusicOnOpen(); } catch (e) {}

  // Разблокируем прокрутку основного документа и фиксируем позицию сверху
  document.body.classList.remove('overflow-hidden');
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  } catch (e) {}

  const envelopeCard = document.getElementById('envelopeCard');
  const envelopeScreen = document.getElementById('envelopeScreen');

  // Запуск аппаратного каскада лепестков
  try { spawnPeonyPetalBurst(); } catch (e) {}

  // Анимация раскрытия конверта
  if (envelopeCard) {
    envelopeCard.style.transform = '';
    envelopeCard.classList.add('opening');
  }

  // Сразу делаем элементы первого экрана активными
  document.querySelectorAll('#screen-1 .reveal-item').forEach(el => el.classList.add('reveal-active'));

  setTimeout(() => {
    if (envelopeScreen) {
      envelopeScreen.classList.add('opened');
      envelopeScreen.style.pointerEvents = 'none';
    }

    setTimeout(() => {
      if (envelopeScreen) {
        envelopeScreen.style.display = 'none';
      }
    }, 750);
  }, 500);
}

// --- 3D TILT, АКСЕЛЕРОМЕТР И ГИРОСКОП (iOS 13+ & SAMSUNG/ANDROID) ---
let targetTiltX = 0;
let targetTiltY = 0;
let currentTiltX = 0;
let currentTiltY = 0;
let gyroPermissionGranted = false;
let gyroActive = false;

// Запрос разрешений для iOS 13+ и регистрация датчиков
function requestSensorsPermission() {
  if (gyroPermissionGranted) return;
  
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(state => {
      if (state === 'granted') {
        gyroPermissionGranted = true;
        window.addEventListener('deviceorientation', handleOrientation, true);
        window.addEventListener('devicemotion', handleMotion, true);
      }
    }).catch(() => {});
  } else {
    gyroPermissionGranted = true;
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion, true);
    }
  }
}

// 1. Слушатель гироскопа (DeviceOrientation)
function handleOrientation(event) {
  if (event.gamma !== null && event.beta !== null) {
    gyroActive = true;
    // Gamma: наклон влево/вправо [-35, 35]
    const gamma = Math.max(-35, Math.min(35, event.gamma));
    // Beta: наклон вперед/назад, центрированный вокруг естественного угла удержания телефона (45°)
    const beta = Math.max(-35, Math.min(35, event.beta - 45));
    targetTiltX = gamma / 20;
    targetTiltY = beta / 20;
  }
}

// 2. Слушатель акселерометра (DeviceMotion fallback для Android)
function handleMotion(event) {
  if (gyroActive) return;
  if (event.accelerationIncludingGravity) {
    const acc = event.accelerationIncludingGravity;
    if (acc.x !== null && acc.y !== null) {
      const gx = Math.max(-8, Math.min(8, acc.x));
      const gy = Math.max(-8, Math.min(8, acc.y - 5));
      targetTiltX = -gx / 4.5;
      targetTiltY = gy / 4.5;
    }
  }
}

// Активация датчиков при клике пользователя
document.addEventListener('click', requestSensorsPermission, { once: true });

// Автоподключение для Android (где requestPermission не требуется)
if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
  window.addEventListener('deviceorientation', handleOrientation, true);
}
if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission !== 'function') {
  window.addEventListener('devicemotion', handleMotion, true);
}

// 3. Десктопная мышь (на смартфонах работают гироскоп и акселерометр, тач-скролл свободен)
window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 2;
  const y = (e.clientY / window.innerHeight - 0.5) * 2;
  targetTiltX = x * 1.4;
  targetTiltY = y * 1.4;
});

// Отслеживаем скроллинг пользователя, чтобы давать 100% приоритет потоку отрисовки скролла в Safari
let isUserScrolling = false;
let scrollPauseTimer = null;
window.addEventListener('scroll', () => {
  isUserScrolling = true;
  clearTimeout(scrollPauseTimer);
  scrollPauseTimer = setTimeout(() => {
    isUserScrolling = false;
  }, 120);
}, { passive: true });

// Плавный цикл интерполяции (Lerp 60 FPS)
let lastAppliedTiltX = 0;
let lastAppliedTiltY = 0;

function updateParallaxLoop() {
  currentTiltX += (targetTiltX - currentTiltX) * 0.085;
  currentTiltY += (targetTiltY - currentTiltY) * 0.085;

  // Во время активного движения пальца/скролла не трогаем CSS переменные для исключения микро-фризов
  if (!isUserScrolling && (Math.abs(currentTiltX - lastAppliedTiltX) > 0.006 || Math.abs(currentTiltY - lastAppliedTiltY) > 0.006)) {
    lastAppliedTiltX = currentTiltX;
    lastAppliedTiltY = currentTiltY;

    const tiltXStr = currentTiltX.toFixed(3);
    const tiltYStr = currentTiltY.toFixed(3);

    const mainContainer = document.getElementById('mainContainer');
    if (mainContainer) {
      mainContainer.style.setProperty('--tilt-x', tiltXStr);
      mainContainer.style.setProperty('--tilt-y', tiltYStr);
    }

    const envelopeScreen = document.getElementById('envelopeScreen');
    if (envelopeScreen && !isEnvelopeOpened) {
      envelopeScreen.style.setProperty('--tilt-x', tiltXStr);
      envelopeScreen.style.setProperty('--tilt-y', tiltYStr);
    }
  }

  requestAnimationFrame(updateParallaxLoop);
}
requestAnimationFrame(updateParallaxLoop);

// --- ВАЛИДАЦИЯ ИМЕНИ ---
function clearNameError() {
  const input = document.getElementById('guestName');
  const tooltip = document.getElementById('nameErrorTooltip');
  if (tooltip) tooltip.classList.add('hidden');
  if (input) {
    input.classList.remove('border-[#E63946]', 'ring-2', 'ring-[#DFB254]', 'input-shake');
    input.classList.add('border-[#DFB254]/60');
  }
}

// --- УПРАВЛЕНИЕ LOCALSTORAGE ---
const LOCAL_STORAGE_KEY = 'jubilee_rsvp_60';

function saveToLocalStorage(data) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

function getFromLocalStorage() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

// Проверка дедлайна изменения ответов
function isDeadlinePassed() {
  const deadline = new Date(`${CONFIG.DEADLINE_DATE}T23:59:59`);
  return new Date() > deadline;
}

// --- ОТОБРАЖЕНИЕ СОСТОЯНИЯ RSVP ---
function renderRSVPState() {
  const savedData = getFromLocalStorage();
  const formContainer = document.getElementById('rsvpFormContainer');
  const statusContainer = document.getElementById('rsvpStatusContainer');
  
  if (!formContainer || !statusContainer) return;

  if (savedData && savedData.name) {
    formContainer.classList.add('hidden');
    statusContainer.classList.remove('hidden');

    const statusIcon = document.getElementById('savedStatusIcon');
    const statusTitle = document.getElementById('savedStatusTitle');
    const guestNameEl = document.getElementById('savedGuestName');
    const statusNote = document.getElementById('savedStatusNote');
    const editBtn = document.getElementById('editRSVPBtn');
    const deadlineText = document.getElementById('savedDeadlineNotice');

    if (guestNameEl) {
      guestNameEl.textContent = savedData.name;
    }

    if (savedData.attending === 'yes') {
      if (statusIcon) {
        statusIcon.innerHTML = `
          <div class="w-12 h-12 rounded-full bg-[#DFB254]/20 border border-[#DFB254] text-[#DFB254] flex items-center justify-center mx-auto shadow-sm">
            <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
        `;
      }
      if (statusTitle) {
        statusTitle.textContent = 'Присутствие подтверждено!';
      }
      if (statusNote) {
        statusNote.innerHTML = 'С нетерпением ждём вас на праздновании 60-летнего Юбилея <strong>27 февраля 2027 г. в 18:00</strong>!';
      }
    } else {
      if (statusIcon) {
        statusIcon.innerHTML = `
          <div class="w-12 h-12 rounded-full bg-[#7D0D19]/40 border border-[#DFB254]/60 text-[#FFE8B6] flex items-center justify-center mx-auto shadow-sm">
            <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </div>
        `;
      }
      if (statusTitle) {
        statusTitle.textContent = 'Ответ принят';
      }
      if (statusNote) {
        statusNote.innerHTML = 'Нам очень жаль, что вы не сможете быть с нами. Спасибо, что сообщили заранее!';
      }
    }

    // Проверяем дедлайн
    if (isDeadlinePassed()) {
      if (editBtn) editBtn.classList.add('hidden');
      if (deadlineText) {
        deadlineText.innerHTML = '<span class="text-[#DFB254]/70">Прием изменений завершен. Списки гостей сформированы.</span>';
      }
    } else {
      if (editBtn) editBtn.classList.remove('hidden');
      if (deadlineText) {
        deadlineText.innerHTML = 'Вы можете изменить ответ до <strong>1 февраля 2027 года</strong>';
      }
    }
  } else {
    formContainer.classList.remove('hidden');
    statusContainer.classList.add('hidden');
  }
}

// Редактирование сохраненного ответа
function editRSVP() {
  playClickSound();
  const savedData = getFromLocalStorage();
  const formContainer = document.getElementById('rsvpFormContainer');
  const statusContainer = document.getElementById('rsvpStatusContainer');
  
  if (savedData) {
    const nameInput = document.getElementById('guestName');
    if (nameInput) nameInput.value = savedData.name || '';

    const yesRadio = document.querySelector('input[name="attendance"][value="yes"]');
    const noRadio = document.querySelector('input[name="attendance"][value="no"]');
    if (savedData.attending === 'yes' && yesRadio) {
      yesRadio.checked = true;
    } else if (noRadio) {
      noRadio.checked = true;
    }
  }

  if (statusContainer) statusContainer.classList.add('hidden');
  if (formContainer) formContainer.classList.remove('hidden');
}

// --- ОБРАБОТКА ОТПРАВКИ ФОРМЫ (RSVP) ---
async function handleRSVP(event) {
  event.preventDefault();

  const nameInput = document.getElementById('guestName');
  const name = nameInput ? nameInput.value.trim() : '';

  // Кастомная валидация имени
  if (!name) {
    const tooltip = document.getElementById('nameErrorTooltip');
    if (tooltip) {
      tooltip.classList.remove('hidden');
    }
    if (nameInput) {
      nameInput.classList.remove('border-[#DFB254]/60');
      nameInput.classList.add('border-[#E63946]', 'ring-2', 'ring-[#DFB254]', 'input-shake');
      nameInput.focus();
      setTimeout(() => {
        nameInput.classList.remove('input-shake');
      }, 450);
    }
    return;
  }

  const attendanceEl = document.querySelector('input[name="attendance"]:checked');
  const attendance = attendanceEl ? attendanceEl.value : 'yes';

  const submitBtn = document.getElementById('rsvpSubmitBtn');
  const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';

  // Блокировка кнопки и отображение загрузки
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-[#2A0407] inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Отправка...</span>
    `;
  }

  // Получаем существующий ID или генерируем новый уникальный
  const savedData = getFromLocalStorage();
  const submissionId = savedData && savedData.id ? savedData.id : ('rsvp_ub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 7));

  const formData = {
    id: submissionId,
    name: name,
    attending: attendance,
    timestamp: new Date().toISOString()
  };

  try {
    // Если задан Google Apps Script URL — отправляем данные
    if (CONFIG.GOOGLE_SCRIPT_URL && CONFIG.GOOGLE_SCRIPT_URL.trim() !== '') {
      await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(formData),
        redirect: 'follow'
      });
    } else {
      console.log('CONFIG.GOOGLE_SCRIPT_URL не задан. Ответ сохранен локально в браузере.');
    }

    // Сохраняем в LocalStorage
    saveToLocalStorage(formData);

    // Праздничный перезвон и золотые конфетти
    playSuccessChime();
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 85,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#DFB254', '#F7E7B4', '#7D0D19', '#ffffff']
      });
    }

    // Настраиваем сообщение модального окна
    const modalText = document.getElementById('modalMessageText');
    if (modalText) {
      if (attendance === 'yes') {
        modalText.innerHTML = `Уважаемый(ая) <strong>${name}</strong>!<br>Ваше присутствие подтверждено. С нетерпением ждём вас на торжестве 27 февраля 2027 года!`;
      } else {
        modalText.innerHTML = `Уважаемый(ая) <strong>${name}</strong>!<br>Спасибо, что сообщили. Нам очень жаль, что вы не сможете быть с нами на юбилее.`;
      }
    }

    // Показываем модальное окно
    const modal = document.getElementById('rsvpModal');
    if (modal) modal.classList.remove('hidden');

    // Обновляем состояние карточки формы
    renderRSVPState();

  } catch (error) {
    console.error('Ошибка отправки RSVP:', error);
    // Даже при сбое сети ответ гостя сохраняется локально
    saveToLocalStorage(formData);
    renderRSVPState();
    
    const modalText = document.getElementById('modalMessageText');
    if (modalText) {
      modalText.innerHTML = `Уважаемый(ая) <strong>${name}</strong>!<br>Ваш ответ сохранен. Ждем вас на торжестве!`;
    }
    const modal = document.getElementById('rsvpModal');
    if (modal) modal.classList.remove('hidden');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;
    }
  }
}

function closeModal() {
  playClickSound();
  const modal = document.getElementById('rsvpModal');
  if (modal) modal.classList.add('hidden');
}

// --- УВЕДОМЛЕНИЯ TOAST ---
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  if (isError) {
    toast.className = "fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white bg-red-700 border border-[#DFB254] shadow-lg text-xs md:text-sm font-semibold z-50 transition-all duration-300 transform translate-y-0 opacity-100 text-center";
  } else {
    toast.className = "fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-[#DFB254] bg-[#2A0407] border border-[#DFB254] shadow-lg text-xs md:text-sm font-semibold z-50 transition-all duration-300 transform translate-y-0 opacity-100 text-center";
  }

  setTimeout(() => {
    toast.className = "fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white opacity-0 pointer-events-none text-center transition-all duration-300 transform -translate-y-10";
  }, 4000);
}

// --- ПЛАВНАЯ ПРОКРУТКА И INTERSECTION OBSERVER ---
function initScrollAndObservers() {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-active');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -20px 0px'
  });

  document.querySelectorAll('.reveal-item').forEach(el => revealObserver.observe(el));

  // Автоскролл к центру при фокусе ввода на мобильных (устранение перекрытия клавиатурой)
  const nameInput = document.getElementById('guestName');
  if (nameInput) {
    nameInput.addEventListener('focus', () => {
      setTimeout(() => {
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  }

  // Навигация между секциями
  const sectionIds = ['screen-1', 'screen-2', 'screen-3'];
  let isScrolling = false;

  function getCurrentSectionIndex() {
    let closestIndex = 0;
    let minDiff = Infinity;
    sectionIds.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        const diff = Math.abs(rect.top);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = idx;
        }
      }
    });
    return closestIndex;
  }

  function goToSection(index) {
    if (index < 0 || index >= sectionIds.length) return;
    const targetEl = document.getElementById(sectionIds[index]);
    if (!targetEl) return;

    isScrolling = true;
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setTimeout(() => {
      isScrolling = false;
    }, 700);
  }


  // Клавиши со стрелками
  window.addEventListener('keydown', (e) => {
    if (!isEnvelopeOpened || isScrolling) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    const currentIdx = getCurrentSectionIndex();
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      if (currentIdx < sectionIds.length - 1) {
        e.preventDefault();
        goToSection(currentIdx + 1);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      if (currentIdx > 0) {
        e.preventDefault();
        goToSection(currentIdx - 1);
      }
    }
  });

  // Плавный переход по ссылкам #screen-...
  document.querySelectorAll('a[href^="#screen-"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href').substring(1);
      const idx = sectionIds.indexOf(targetId);
      if (idx !== -1) {
        e.preventDefault();
        playClickSound();
        goToSection(idx);
      }
    });
  });
}

// --- ОПРЕДЕЛЕНИЕ ОБРАЩЕНИЯ: "Дорогие", "Дорогой", "Дорогая" ---
function resolveGuestGreeting(rawInput) {
  if (!rawInput) {
    return {
      greeting: 'Дорогие гости!',
      cleanName: '',
      isPlural: true
    };
  }

  let text = rawInput.trim();

  // Если уже передано готовое приветствие ("Дорогой Иван", "Уважаемая Елена", "Дорогие друзья")
  if (/^(Дорогие|Дорогой|Дорогая|Уважаемый|Уважаемая|Привет|Здравствуйте)\b/i.test(text)) {
    let greeting = text;
    if (!greeting.endsWith('!') && !greeting.endsWith('.')) greeting += '!';
    const isPlural = /^(Дорогие|Здравствуйте)\b/i.test(text) || 
                     text.toLowerCase().includes(' и ') || 
                     text.toLowerCase().includes(' с ') || 
                     text.includes('&') || text.includes('+') || text.includes(',');
    const cleanName = text.replace(/^(Дорогие|Дорогой|Дорогая|Уважаемый|Уважаемая|Привет|Здравствуйте)\s+/i, '').replace(/[!.]+$/, '').trim();
    return { greeting, cleanName, isPlural };
  }

  // Очищаем от знаков в конце
  text = text.replace(/[!.]+$/, '').trim();

  // 1. Проверка на множественное число (пара / семья / группа)
  const isPlural = text.toLowerCase().includes(' и ') ||
                   text.toLowerCase().includes(' с ') ||
                   text.includes('&') ||
                   text.includes('+') ||
                   text.includes(',') ||
                   /^семья\b/i.test(text);

  if (isPlural) {
    return {
      greeting: `Дорогие ${text}!`,
      cleanName: text,
      isPlural: true
    };
  }

  // 2. Одиночное имя: определяем пол (Мужской / Женский)
  const words = text.split(/\s+/);
  
  // Исключения мужских имен на -а / -я:
  const maleNamesOnA = [
    'никита', 'илья', 'данила', 'данил', 'лука', 'фома', 'кузьма', 'лева', 'лёва', 
    'миша', 'саша', 'женя', 'дима', 'паша', 'ваня', 'петя', 'коля', 'рома', 
    'сережа', 'серёжа', 'вова', 'юра', 'гриша', 'боря', 'толя', 'костя', 'тима', 'юлий'
  ];

  // Исключения женских имен на согласный или мягкий знак:
  const femaleExceptions = [
    'любовь', 'кармен', 'нинель', 'айгуль', 'анель', 'гульнар', 'мадина', 'асель', 'динар', 'жанар'
  ];

  let isFemale = false;

  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase();
    
    if (femaleExceptions.includes(w)) {
      isFemale = true;
      break;
    }

    if (maleNamesOnA.includes(w)) {
      isFemale = false;
      break;
    }

    // Женские отчества (-вна, -чна)
    if (w.endsWith('вна') || w.endsWith('чна')) {
      isFemale = true;
      break;
    }

    // Мужские отчества (-вич, -ич)
    if (w.endsWith('вич') || w.endsWith('ич')) {
      isFemale = false;
      break;
    }

    // Женские фамилии (-ова, -ева, -ёва, -ина, -ына, -ая)
    if (w.endsWith('ова') || w.endsWith('ева') || w.endsWith('ёва') || w.endsWith('ина') || w.endsWith('ына') || w.endsWith('ая')) {
      isFemale = true;
      break;
    }

    // Мужские фамилии (-ов, -ев, -ёв, -ин, -ын, -ий, -ый)
    if (w.endsWith('ов') || w.endsWith('ев') || w.endsWith('ёв') || w.endsWith('ин') || w.endsWith('ын') || w.endsWith('ий') || w.endsWith('ый')) {
      isFemale = false;
      break;
    }

    // Окончания русских/казахских женских имен на -а, -я
    if (w.endsWith('а') || w.endsWith('я')) {
      isFemale = true;
    }
  }

  const prefix = isFemale ? 'Дорогая' : 'Дорогой';
  return {
    greeting: `${prefix} ${text}!`,
    cleanName: text,
    isPlural: false
  };
}

// --- ПЕРСОНАЛИЗАЦИЯ ИМЕНИ ИЗ URL (?name=... / ?guest=... / ?Имя) ---
function setupPersonalization() {
  const greetingNameEl = document.getElementById('guest-name');
  const greetingTextEl = document.getElementById('guest-greeting-text');
  const envelopeGreetingEl = document.getElementById('envelope-guest-greeting');

  const urlParams = new URLSearchParams(window.location.search);
  let guestName = urlParams.get('name') || urlParams.get('guest') || urlParams.get('') || '';
  
  const search = window.location.search;
  if (!guestName && search && search.startsWith('?') && !search.includes('=')) {
    guestName = decodeURIComponent(search.substring(1)).trim();
  }

  const { greeting, cleanName, isPlural } = resolveGuestGreeting(guestName);

  if (greetingNameEl) {
    greetingNameEl.textContent = greeting;
  }

  if (greetingTextEl) {
    if (isPlural) {
      greetingTextEl.innerHTML = 'Приглашаем вас разделить с нами радость торжественного события — <strong class="text-[#DFB254] uppercase font-semibold">60-ЛЕТНЕГО ЮБИЛЕЯ (ХВАНГАП)</strong> нашего дорогого юбиляра!';
    } else {
      greetingTextEl.innerHTML = 'Приглашаем Вас разделить с нами радость торжественного события — <strong class="text-[#DFB254] uppercase font-semibold">60-ЛЕТНЕГО ЮБИЛЕЯ (ХВАНГАП)</strong> нашего дорогого юбиляра!';
    }
  }

  if (cleanName) {
    const input = document.getElementById('guestName');
    if (input && !input.value) {
      input.value = cleanName;
    }

    if (envelopeGreetingEl) {
      envelopeGreetingEl.textContent = `Для: ${cleanName}`;
      envelopeGreetingEl.classList.remove('hidden');
    }
  }
}

// --- БЛОКИРОВКА СДВИГА И РЕЗИНОВОГО ДЁРГАНИЯ НА ЭКРАНЕ КОНВЕРТА ---
function setupEnvelopeScreen() {
  const envelopeScreen = document.getElementById('envelopeScreen');
  if (envelopeScreen) {
    // Полная блокировка скролла и эластичного резинового отскока iOS при любых свайпах пальцем
    envelopeScreen.addEventListener('touchmove', (e) => {
      if (!isEnvelopeOpened) {
        e.preventDefault();
      }
    }, { passive: false });
  }
}

// --- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ---
document.addEventListener('DOMContentLoaded', () => {
  setupEnvelopeScreen();
  setupAudio();
  updateCountdown();
  setInterval(updateCountdown, 1000);
  renderRSVPState();
  initScrollAndObservers();
  setupPersonalization();
});
