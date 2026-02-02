export const translations = {
  en: {
    // Common
    appName: '1-on-1 Meetings',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    logout: 'Logout',

    // Auth
    signIn: 'Sign In',
    signInToContinue: 'Sign in to continue',
    signingIn: 'Signing in...',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    setPassword: 'Set Password',
    settingUp: 'Setting up...',
    setupPassword: 'Set up your password to get started',
    loginFailed: 'Login failed',
    setupFailed: 'Setup failed',
    passwordMinLength: 'Password must be at least 4 characters',
    passwordsDoNotMatch: 'Passwords do not match',

    // Employees
    employees: 'Employees',
    addEmployee: 'Add Employee',
    editEmployee: 'Edit Employee',
    name: 'Name',
    position: 'Position',
    positionOptional: 'Position (optional)',
    adding: 'Adding...',
    noEmployees: 'No employees yet. Add your first employee to get started.',
    deleteEmployeeConfirm: 'Are you sure you want to delete this employee? All meetings and agenda items will be deleted.',
    topics: 'topics',
    lastMeeting: 'Last 1-1',
    noMeetingsYet: 'No meetings yet',

    // Agenda
    agendaTopics: 'Agenda Topics',
    addTopicPlaceholder: 'Add a topic to discuss...',
    noTopics: 'No topics yet. Add a topic to prepare for the next 1-1.',
    discussed: 'Discussed',
    createdAt: 'Added',
    dragToReorder: 'Drag to reorder',

    // Categories
    categoryNote: 'Note',
    categoryPositive: 'Positive feedback',
    categoryWarning: 'Warning',
    categoryProblem: 'Problem',

    // Meetings
    meetingHistory: 'Meeting History',
    conductMeeting: 'Conduct 1-1 Meeting',
    completeMeeting: 'Complete Meeting',
    saving: 'Saving...',
    topicsToDiscuss: 'Topics to Discuss',
    meetingNotes: 'Meeting Notes',
    meetingNotesPlaceholder: 'Key takeaways, action items, decisions made...',
    noMeetingsHistory: 'No meetings yet. Conduct your first 1-1 to get started.',
    noNotes: 'No notes',
    discussedLabel: 'Discussed:',

    // Language
    language: 'Language',
  },
  ru: {
    // Common
    appName: '1-on-1 Встречи',
    loading: 'Загрузка...',
    save: 'Сохранить',
    cancel: 'Отмена',
    add: 'Добавить',
    edit: 'Редактировать',
    delete: 'Удалить',
    logout: 'Выйти',

    // Auth
    signIn: 'Войти',
    signInToContinue: 'Войдите для продолжения',
    signingIn: 'Вход...',
    password: 'Пароль',
    confirmPassword: 'Подтвердите пароль',
    setPassword: 'Установить пароль',
    settingUp: 'Настройка...',
    setupPassword: 'Установите пароль для начала работы',
    loginFailed: 'Ошибка входа',
    setupFailed: 'Ошибка настройки',
    passwordMinLength: 'Пароль должен быть не менее 4 символов',
    passwordsDoNotMatch: 'Пароли не совпадают',

    // Employees
    employees: 'Сотрудники',
    addEmployee: 'Добавить сотрудника',
    editEmployee: 'Редактировать сотрудника',
    name: 'Имя',
    position: 'Должность',
    positionOptional: 'Должность (необязательно)',
    adding: 'Добавление...',
    noEmployees: 'Пока нет сотрудников. Добавьте первого сотрудника для начала работы.',
    deleteEmployeeConfirm: 'Вы уверены, что хотите удалить этого сотрудника? Все встречи и темы для обсуждения будут удалены.',
    topics: 'тем',
    lastMeeting: 'Последняя 1-1',
    noMeetingsYet: 'Встреч пока не было',

    // Agenda
    agendaTopics: 'Темы для обсуждения',
    addTopicPlaceholder: 'Добавить тему для обсуждения...',
    noTopics: 'Пока нет тем. Добавьте тему для подготовки к следующей 1-1.',
    discussed: 'Обсуждено',
    createdAt: 'Добавлено',
    dragToReorder: 'Перетащите для изменения порядка',

    // Categories
    categoryNote: 'Заметка',
    categoryPositive: 'Позитивная ОС',
    categoryWarning: 'Замечание',
    categoryProblem: 'Проблема',

    // Meetings
    meetingHistory: 'История встреч',
    conductMeeting: 'Провести 1-1 встречу',
    completeMeeting: 'Завершить встречу',
    saving: 'Сохранение...',
    topicsToDiscuss: 'Темы для обсуждения',
    meetingNotes: 'Заметки встречи',
    meetingNotesPlaceholder: 'Ключевые выводы, задачи, принятые решения...',
    noMeetingsHistory: 'Пока нет встреч. Проведите первую 1-1 для начала.',
    noNotes: 'Нет заметок',
    discussedLabel: 'Обсудили:',

    // Language
    language: 'Язык',
  },
} as const

export type Language = keyof typeof translations
export type TranslationKey = keyof typeof translations.en
