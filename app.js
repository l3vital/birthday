/**
 * Клиентская логика для сайта-приглашения «Сафари»
 */

// --- КОНФИГУРАЦИЯ ---
const CONFIG = {
  // Дата мероприятия в формате YYYY-MM-DD
  EVENT_DATE: '2026-08-15',
  
  // Количество дней до праздника, когда закрывается редактирование
  DAYS_BEFORE_DEADLINE: 10,
  
  // URL вашего развернутого Google Apps Script
  // Замените на вашу ссылку после развертывания
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzKn4Bh1Nkvv7dM-ryVB1r-_j4lnDhiA--aOUKukGE-a-NL1rXARMdE7VW1E5m_vjDbBQ/exec',
  
  // Фоновая музыка (если пусто, будет играть процедурный музыкальный бокс Web Audio API)
  BG_MUSIC_URL: 'music.mp3',
};

// Вычисляем дату дедлайна (на 10 дней раньше даты мероприятия)
const getDeadlineDate = () => {
  const eventDate = new Date(CONFIG.EVENT_DATE);
  eventDate.setDate(eventDate.getDate() - CONFIG.DAYS_BEFORE_DEADLINE);
  return eventDate;
};

// --- ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА ---
document.addEventListener('DOMContentLoaded', () => {
  // Настройка анимаций через нативный Intersection Observer.
  try { setupSectionAnimations(); } catch (e) { console.error("Animations setup failed:", e); }

  // Запуск персонализации
  try { setupPersonalization(); } catch (e) { console.error("Personalization setup failed:", e); }

  // Настройка RSVP формы и LocalStorage
  try { setupRSVPForm(); } catch (e) { console.error("RSVP setup failed:", e); }

  // Настройка звуков и аудио
  try { setupAudio(); } catch (e) { console.error("Audio setup failed:", e); }

  // Настройка конверта-обложки
  try { setupEnvelope(); } catch (e) { console.error("Envelope setup failed:", e); }

  // Настройка параллакса фона
  try { setupParallax(); } catch (e) { console.error("Parallax setup failed:", e); }

  // Настройка интерактивных blobs
  try { setupInteractiveBlobs(); } catch (e) { console.error("Blobs setup failed:", e); }
});

// --- ПАРАЛЛАКС ФОНА (8 ЖИВОТНЫХ С ВЕРТИКАЛЬНЫМ И ВРАЩАТЕЛЬНЫМ ДВИЖЕНИЕМ) ---
function setupParallax() {
  // Функция отключена, так как фоновые анимированные листья удалены по запросу пользователя.
}

// --- ИНТЕРАКТИВНЫЕ BLOB-ФИГУРЫ НА ЗАДНЕМ ФОНЕ ---
function setupInteractiveBlobs() {
  const scrollContainer = document.getElementById('scroll-container');
  const blobs = [
    document.getElementById('interactive-blob-1'),
    document.getElementById('interactive-blob-2'),
    document.getElementById('interactive-blob-3'),
    document.getElementById('interactive-blob-4')
  ];

  if (!scrollContainer) return;

  // Кэшируем размеры контейнера во избежание layout thrashing (перерисовок макета)
  let rect = scrollContainer.getBoundingClientRect();
  window.addEventListener('resize', () => {
    rect = scrollContainer.getBoundingClientRect();
  });

  // Отслеживаем движение мыши для сдвига blobs (активно только для десктопа)
  scrollContainer.addEventListener('mousemove', (e) => {
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    blobs.forEach((blob, index) => {
      if (blob) {
        const factor = (index + 1) * 35; // Сдвиг до 35px - 140px
        const moveX = x * factor;
        const moveY = y * factor;
        blob.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    });
  });

  // На сенсорных экранах свайпы используются для скролла, поэтому touchmove отключен
  // для предотвращения лагов скролла и обеспечения 60fps
}

// --- КОНВЕРТ-ОБЛОЖКА (3D FLIP ЭФФЕКТ) ---
function setupEnvelope() {
  const cover = document.getElementById('envelope-cover');
  const envelope = document.getElementById('envelope');
  const openBtn = document.getElementById('open-envelope-btn');
  const readBtn = document.getElementById('read-card-btn');
  const scrollContainer = document.getElementById('scroll-container');

  const openEnvelope = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Если уже открыт, игнорируем
    if (envelope && envelope.classList.contains('open')) return;

    try {
      playClickSound();
    } catch (err) {
      console.warn("Click sound play failed:", err);
    }

    try {
      // Инициализируем аудио и запускаем музыку
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx && audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
        audioCtx.resume();
      }
      startMusic();
      updateMusicToggleButton(true);
      
      // Запускаем асинхронную подгрузку остальных картинок в фоне
      lazyLoadAssets();
    } catch (err) {
      console.warn("AudioContext initialization skipped (autoplay block/not supported):", err);
    }

    // Скрываем подсказку "нажми"
    const hint = document.querySelector('.envelope-hint');
    if (hint) {
      hint.style.opacity = '0';
      hint.style.pointerEvents = 'none';
      setTimeout(() => {
        hint.style.display = 'none';
      }, 500);
    }

    // Открываем клапан и выдвигаем карточку
    if (envelope) {
      envelope.classList.add('open');
    }
  };

  // Клик 1: Открытие восковой печати (выезд письма)
  // На мобильных клик срабатывает мгновенно благодаря viewport meta-тегу.
  // Использование click гарантирует распознавание жеста в Safari для старта музыки.
  if (openBtn) {
    openBtn.addEventListener('click', openEnvelope);
  }

  // Клик 2: Нажатие кнопки "ОТКРЫТЬ" на карточке (3D flip конверта в основной сайт)
  if (readBtn && cover && scrollContainer) {
    const handleRead = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      playSuccessChime();

      // Гарантируем запуск музыки, если она не запустилась на первом клике
      if (!isMusicPlaying) {
        startMusic();
        updateMusicToggleButton(true);
      }
      lazyLoadAssets();

      // Запускаем 3D-переворот конверта
      cover.classList.add('flipped');
      scrollContainer.classList.add('flipped');

      // Разблокируем прокрутку основного сайта и жестко скрываем горизонтальный скролл
      scrollContainer.classList.remove('overflow-y-hidden');
      scrollContainer.classList.add('overflow-y-scroll');

      // Удаляем конверт-обложку из DOM после завершения 3D анимации (1.2 сек)
      setTimeout(() => {
        cover.remove();
        // Принудительно триггерим resize, чтобы Intersection Observer корректно анимировал первый экран
        window.dispatchEvent(new Event('resize'));
        // Скроллим к первому экрану для точного выравнивания и скрытия верхнего разделителя
        const firstSection = scrollContainer.querySelector('section');
        if (firstSection) {
          firstSection.scrollIntoView({ block: 'start' });
        }
      }, 1200);
    };

    readBtn.addEventListener('click', handleRead);
  }
}

// --- АНИМАЦИИ СЕКЦИЙ (INTERSECTION OBSERVER) ---
function setupSectionAnimations() {
  const sections = document.querySelectorAll('section');
  const scrollContainer = document.getElementById('scroll-container');

  const observerOptions = {
    root: scrollContainer,
    threshold: 0.3
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, observerOptions);

  sections.forEach(section => {
    observer.observe(section);
  });
}

// --- ПЕРСОНАЛИЗАЦИЯ ИМЕНИ ---
function setupPersonalization() {
  const greetingNameElement = document.getElementById('guest-name');
  const greetingTextElement = document.getElementById('guest-greeting-text');
  const envelopeGreetingText = document.getElementById('envelope-greeting-text');
  
  // Получаем параметры из URL
  const urlParams = new URLSearchParams(window.location.search);
  let guestName = urlParams.get('name');
  
  if (!guestName) {
    // Резервная проверка для ?=Имя
    guestName = urlParams.get('');
  }
  
  const search = window.location.search;
  if (!guestName && search && search.startsWith('?') && !search.includes('=')) {
    // Резервная проверка для ?Имя (без знака равенства)
    guestName = decodeURIComponent(search.substring(1)).trim();
  }
  
  if (guestName) {
    // Очищаем имя гостя
    const decodedName = guestName.trim();
    
    if (greetingNameElement) {
      greetingNameElement.textContent = decodedName;
    }
    
    // Проверяем, содержит ли имя союзы или знаки, указывающие на двоих/группу
    const isPlural = decodedName.toLowerCase().includes(' и ') || 
                     decodedName.toLowerCase().includes(' с ') || 
                     decodedName.includes(',') || 
                     decodedName.includes('&') || 
                     decodedName.includes('+');
                        
    if (greetingTextElement) {
      if (isPlural) {
        greetingTextElement.textContent = 'Приглашаем вас в увлекательное путешествие по диким джунглям!';
      } else {
        greetingTextElement.textContent = 'Приглашаем тебя в увлекательное путешествие по диким джунглям!';
      }
    }
    
    if (envelopeGreetingText) {
      if (isPlural) {
        envelopeGreetingText.textContent = 'Вас ждут незабываемые приключения в мире диких джунглей!';
      } else {
        envelopeGreetingText.textContent = 'Тебя ждут незабываемые приключения в мире диких джунглей!';
      }
    }
  } else {
    // По умолчанию для общих приглашений
    if (greetingNameElement) {
      greetingNameElement.textContent = 'Дорогие гости';
    }
    if (greetingTextElement) {
      greetingTextElement.textContent = 'Приглашаем вас в увлекательное путешествие по диким джунглям!';
    }
    if (envelopeGreetingText) {
      envelopeGreetingText.textContent = 'Вас ждут незабываемые приключения в мире диких джунглей!';
    }
  }
}

// --- RSVP ФОРМА И LOCALSTORAGE ---
function setupRSVPForm() {
  // Настройка плавной прокрутки кнопки CTA без смены хэша (предотвращает остановку музыки на iOS)
  const ctaBtn = document.getElementById('cta-confirm-btn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try { playClickSound(); } catch (err) {}
      const rsvpSection = document.getElementById('rsvp');
      if (rsvpSection) {
        rsvpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  const rsvpForm = document.getElementById('rsvp-form');
  const statusContainer = document.getElementById('rsvp-status-container');
  const formContainer = document.getElementById('rsvp-form-container');
  
  const radioYes = document.getElementById('status-yes');
  const rsvpYes = document.getElementById('status-yes'); // Для обратной совместимости
  
  // Проверка сохраненного ответа
  renderRSVPState();

  const radioNo = document.getElementById('status-no');

  // Обработчик отправки формы
  if (rsvpForm) {
    rsvpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      playClickSound();

      const submitBtn = rsvpForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      
      // Блокируем кнопку
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Отправка...
      `;

      // Получаем или генерируем уникальный ID отправки для предотвращения дубликатов при редактировании
      const savedData = getFromLocalStorage();
      let submissionId = savedData ? savedData.id : null;
      if (!submissionId) {
        submissionId = 'rsvp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }

      const isAttending = radioYes && radioYes.checked;

      // Собираем данные
      const formData = {
        id: submissionId,
        name: document.getElementById('name-input').value,
        attending: isAttending ? 'yes' : 'no',
        timestamp: new Date().toISOString()
      };

      // Если нет URL скрипта, симулируем отправку
      if (!CONFIG.GOOGLE_SCRIPT_URL) {
        console.warn('CONFIG.GOOGLE_SCRIPT_URL не задан. Симулируем отправку.');
        setTimeout(() => {
          saveToLocalStorage(formData);
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
          showToast('Ваш ответ успешно отправлен! Ждем вас 🦒');
          renderRSVPState();
          playSuccessChime();
        }, 1500);
        return;
      }

      try {
        await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors', // Важно для обхода CORS ограничений Google Apps Script
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(formData),
          redirect: 'follow'
        });

        // Записываем в localstorage и считаем отправку успешной
        saveToLocalStorage(formData);
        showToast('Ваш ответ успешно сохранен! 🎉');
        renderRSVPState();
        playSuccessChime();
      } catch (err) {
        console.error('Ошибка отправки формы:', err);
        showToast('Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз.', true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }
}

// Запись в LocalStorage
function saveToLocalStorage(data) {
  localStorage.setItem('safari_rsvp', JSON.stringify(data));
}

// Получение из LocalStorage
function getFromLocalStorage() {
  const data = localStorage.getItem('safari_rsvp');
  return data ? JSON.parse(data) : null;
}

// Функция отображения текущего состояния RSVP
function renderRSVPState() {
  const savedData = getFromLocalStorage();
  const statusContainer = document.getElementById('rsvp-status-container');
  const formContainer = document.getElementById('rsvp-form-container');
  
  if (!statusContainer || !formContainer) return;

  if (savedData) {
    // Вычисляем дедлайн изменения ответа
    const now = new Date();
    const deadline = getDeadlineDate();
    const canEdit = now < deadline;

    // Скрываем форму и показываем статус
    formContainer.classList.add('hidden');
    statusContainer.classList.remove('hidden');

    const statusTitle = document.getElementById('status-summary-title');
    const statusText = document.getElementById('status-summary-details');
    const editBtn = document.getElementById('edit-rsvp-btn');
    const deadlineInfo = document.getElementById('edit-deadline-info');

    // Форматируем дату дедлайна
    const options = { day: 'numeric', month: 'long' };
    const deadlineFormatted = deadline.toLocaleDateString('ru-RU', options);
    const eventDateFormatted = new Date(CONFIG.EVENT_DATE).toLocaleDateString('ru-RU', options);

    // Вычисляем персонализацию для экрана статуса
    const urlParams = new URLSearchParams(window.location.search);
    let guestName = urlParams.get('name') || urlParams.get('') || '';
    const search = window.location.search;
    if (!guestName && search && search.startsWith('?') && !search.includes('=')) {
      guestName = decodeURIComponent(search.substring(1)).trim();
    }
    const isPlural = !guestName || 
                     guestName.trim().toLowerCase().includes(' и ') || 
                     guestName.trim().toLowerCase().includes(' с ') || 
                     guestName.includes(',') || 
                     guestName.includes('&') ||
                     guestName.includes('+');

    if (savedData.attending === 'yes') {
      if (statusTitle) {
        statusTitle.textContent = isPlural ? 'Вы подтвердили своё участие! 🎉' : 'Твоё участие подтверждено! 🎉';
      }
      if (statusText) {
        statusText.innerHTML = isPlural ? `Мы ждем вас <b>${eventDateFormatted}</b>.` : `Мы ждем тебя <b>${eventDateFormatted}</b>.`;
      }
    } else {
      if (statusTitle) {
        statusTitle.textContent = isPlural ? 'К сожалению, вы не сможете прийти 😢' : 'Жаль, что не сможешь прийти 😢';
      }
      if (statusText) {
        statusText.innerHTML = isPlural 
          ? 'Нам очень жаль, но спасибо за своевременный ответ! Если ваши планы изменятся, вы можете скорректировать ответ здесь.'
          : 'Нам очень жаль, но спасибо за своевременный ответ! Если твои планы изменятся, ты можешь скорректировать ответ здесь.';
      }
    }

    if (canEdit) {
      if (editBtn) editBtn.classList.remove('hidden');
      if (deadlineInfo) deadlineInfo.innerHTML = `Вы можете изменить ответ до <b>${deadlineFormatted}</b>.`;
      
      // Обработчик кнопки изменения (поддержка кликов и тачей)
      if (editBtn) {
        const handleEdit = (e) => {
          if (e) e.preventDefault();
          playClickSound();
          // Предзаполняем форму
          const nameInput = document.getElementById('name-input');
          if (nameInput) nameInput.value = savedData.name;
          
          const statusYes = document.getElementById('status-yes');
          const statusNo = document.getElementById('status-no');
          if (savedData.attending === 'yes') {
            if (statusYes) statusYes.checked = true;
            if (statusNo) statusNo.checked = false;
          } else {
            if (statusYes) statusYes.checked = false;
            if (statusNo) statusNo.checked = true;
          }
          
          // Показываем форму и скрываем статус
          if (statusContainer) statusContainer.classList.add('hidden');
          if (formContainer) formContainer.classList.remove('hidden');
        };
        editBtn.onclick = handleEdit;
        editBtn.ontouchstart = handleEdit;
      }
    } else {
      if (editBtn) editBtn.classList.add('hidden');
      if (deadlineInfo) deadlineInfo.innerHTML = `<span class="text-amber-700">Изменение ответов завершено. Списки гостей сформированы.</span>`;
    }
  } else {
    // Предзаполняем поле имени из URL
    const nameInput = document.getElementById('name-input');
    if (nameInput) {
      const urlParams = new URLSearchParams(window.location.search);
      let guestName = urlParams.get('name') || urlParams.get('') || '';
      const search = window.location.search;
      if (!guestName && search && search.startsWith('?') && !search.includes('=')) {
        guestName = decodeURIComponent(search.substring(1)).trim();
      }
      if (guestName) {
        nameInput.value = guestName.trim();
      }
    }
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  if (isError) {
    toast.className = "fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white bg-red-600 shadow-lg text-sm md:text-base font-semibold z-50 transition-all duration-300 transform translate-y-0 opacity-100 text-center";
  } else {
    toast.className = "fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white bg-emerald-600 shadow-lg text-sm md:text-base font-semibold z-50 transition-all duration-300 transform translate-y-0 opacity-100 text-center";
  }

  // Скрытие через 4 секунды
  setTimeout(() => {
    toast.className = "fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white bg-emerald-600 shadow-lg text-sm md:text-base font-semibold z-50 transition-all duration-300 transform -translate-y-10 opacity-0 pointer-events-none text-center";
  }, 4000);
}


// --- ЗВУКИ И МУЗЫКА ---
let audioCtx = null;
let bgMusic = null;
let isMusicPlaying = false;
let userInteractedWithMusic = false;

function setupAudio() {
  const playBtn = document.getElementById('music-toggle');
  
  // Создаем аудио-объект в памяти, чтобы iOS Safari не считал его "за пределами экрана" (off-screen)
  // и не ставил на паузу при скролле страницы
  if (!bgMusic) {
    bgMusic = new Audio(CONFIG.BG_MUSIC_URL || 'music.mp3');
    bgMusic.loop = true;
    bgMusic.preload = 'auto';
    bgMusic.volume = 0.4;
  }

  // Функция для принудительной инициализации и запуска контекста (для кликов)
  const initAudioCtx = () => {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx && audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
        audioCtx.resume();
      }
    } catch (e) {
      console.warn("AudioContext creation failed during touch/click:", e);
    }
  };

  // Однократный разблокировщик для iOS Safari при первом таче / клике на странице
  const unlockAudioOnFirstTouch = () => {
    initAudioCtx();
    if (bgMusic) {
      bgMusic.load();
    }
    document.removeEventListener('touchstart', unlockAudioOnFirstTouch);
    document.removeEventListener('click', unlockAudioOnFirstTouch);
  };
  document.addEventListener('touchstart', unlockAudioOnFirstTouch, { passive: true });
  document.addEventListener('click', unlockAudioOnFirstTouch);

  if (!playBtn) return;

  // Ручной обработчик кнопки звука (клик)
  const handleMusicToggle = (e) => {
    userInteractedWithMusic = true;
    initAudioCtx(); // Гарантируем инициализацию при ручном переключении
    toggleMusic(playBtn);
  };
  playBtn.addEventListener('click', handleMusicToggle);
}

function toggleMusic(playBtn) {
  if (isMusicPlaying) {
    stopMusic();
    updateMusicToggleButton(false);
  } else {
    if (audioCtx && audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
      audioCtx.resume();
    }
    startMusic();
    updateMusicToggleButton(true);
  }
}

function updateMusicToggleButton(isPlaying) {
  const playBtn = document.getElementById('music-toggle');
  if (!playBtn) return;
  if (isPlaying) {
    playBtn.innerHTML = `
      <svg class="w-6 h-6 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
      </svg>
    `;
  } else {
    playBtn.innerHTML = `
      <svg class="w-6 h-6 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>
      </svg>
    `;
  }
}

// Процедурный синтез звука клика (мягкий деревянный звук в стиле сафари)
function playClickSound() {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
      audioCtx.resume();
    }
  } catch (e) {}

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.1);
}

// Процедурный синтез победного перезвона при отправке
function playSuccessChime() {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
      audioCtx.resume();
    }
  } catch (e) {}

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const time = audioCtx.currentTime + idx * 0.12;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.1, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.start(time);
    osc.stop(time + 0.3);
  });
}

// --- ВОСПРОИЗВЕДЕНИЕ MP3 ---
function startMusic() {
  if (!bgMusic) {
    bgMusic = new Audio(CONFIG.BG_MUSIC_URL || 'music.mp3');
    bgMusic.loop = true;
    bgMusic.preload = 'auto';
    bgMusic.volume = 0.4;
  }
  if (bgMusic) {
    bgMusic.volume = 0.4;
    const playPromise = bgMusic.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        isMusicPlaying = true;
      }).catch(err => {
        console.warn("bgMusic play prevented or failed:", err);
        isMusicPlaying = false;
        updateMusicToggleButton(false);
      });
    }
  }
}

function stopMusic() {
  if (bgMusic) {
    bgMusic.pause();
  }
  isMusicPlaying = false;
}

// --- АСИНХРОННАЯ ОТЛОЖЕННАЯ ЗАГРУЗКА КАРТИНОК ДЛЯ ПОВЫШЕНИЯ СКОРОСТИ СТАРТА ---
function lazyLoadAssets() {
  // Загружаем фоновые изображения секций
  const lazyBgs = document.querySelectorAll('.lazy-bg');
  lazyBgs.forEach(el => {
    if (el.dataset.bg) {
      el.style.backgroundImage = `url('${el.dataset.bg}')`;
    }
  });

  // Загружаем растровые изображения (фото)
  const lazyImgs = document.querySelectorAll('.lazy-img');
  lazyImgs.forEach(el => {
    if (el.dataset.src) {
      el.src = el.dataset.src;
    }
  });
}



