// Пн=дайджест, Вт=анализ, Ср=hot take, Чт=совет, Пт=итоги, Сб-Вс=лайт
const WEEKDAY_SCHEDULE = {
  1: [ // Пн
    { type: 'digest', weight: 50 },
    { type: 'news_flash', weight: 30 },
    { type: 'tip', weight: 20 }
  ],
  2: [ // Вт
    { type: 'analysis', weight: 50 },
    { type: 'news_flash', weight: 30 },
    { type: 'prediction', weight: 20 }
  ],
  3: [ // Ср
    { type: 'hot_take', weight: 40 },
    { type: 'news_flash', weight: 30 },
    { type: 'series', weight: 30 }
  ],
  4: [ // Чт
    { type: 'tip', weight: 50 },
    { type: 'news_flash', weight: 30 },
    { type: 'analysis', weight: 20 }
  ],
  5: [ // Пт
    { type: 'digest', weight: 40 },
    { type: 'news_flash', weight: 30 },
    { type: 'hot_take', weight: 30 }
  ],
  6: [ // Сб
    { type: 'news_flash', weight: 40 },
    { type: 'tip', weight: 30 },
    { type: 'prediction', weight: 30 }
  ],
  0: [ // Вс
    { type: 'news_flash', weight: 40 },
    { type: 'series', weight: 30 },
    { type: 'tip', weight: 30 }
  ]
};

const POSTS_PER_DAY = {
  1: 5, 2: 5, 3: 5, 4: 5, 5: 5,
  6: 3, 0: 3
};

export function getPostTypeForSlot(slotIndex = 0) {
  const dayOfWeek = new Date().getDay();
  const schedule = WEEKDAY_SCHEDULE[dayOfWeek] || WEEKDAY_SCHEDULE[1];

  if (slotIndex === 0) return schedule[0].type;

  const totalWeight = schedule.reduce((sum, s) => sum + s.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const slot of schedule) {
    rand -= slot.weight;
    if (rand <= 0) return slot.type;
  }

  return schedule[0].type;
}

export function getPostsCountToday() {
  const dayOfWeek = new Date().getDay();
  return POSTS_PER_DAY[dayOfWeek] || 5;
}

export function getTodayScheduleInfo() {
  const dayOfWeek = new Date().getDay();
  const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  return {
    day: dayNames[dayOfWeek],
    postsCount: POSTS_PER_DAY[dayOfWeek],
    schedule: WEEKDAY_SCHEDULE[dayOfWeek].map((s) => `${s.type} (${s.weight}%)`),
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6
  };
}
