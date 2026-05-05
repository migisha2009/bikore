import * as Localization from 'expo-localization';
import I18n from 'i18n-js';

// Set the locale once at the beginning of your app
I18n.defaultLocale = 'en';
I18n.locale = Localization.locale;
I18n.fallbacks = true;

// Define the translation keys
const translations = {
  en: {
    // Common
    welcome: 'Welcome',
    saveTogether: 'Save Together',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    update: 'Update',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    retry: 'Retry',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    refresh: 'Refresh',
    
    // Navigation
    home: 'Home',
    groups: 'Groups',
    payments: 'Payments',
    profile: 'Profile',
    notifications: 'Notifications',
    analytics: 'Analytics',
    goals: 'Goals',
    
    // Auth
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    phone: 'Phone',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    
    // Dashboard
    greeting: 'Hello, {{name}} 👋',
    welcomeBack: 'Welcome back to your savings journey',
    totalContributed: 'Total Contributed',
    activeGroups: 'Active Groups',
    pending: 'Pending',
    paymentDue: 'Payment Due',
    paymentDueMessage: 'You have {{count}} pending payment(s)',
    payNow: 'Pay Now',
    myGroups: 'My Groups',
    noGroups: 'No Groups Yet',
    createGroup: 'Create Group',
    joinGroup: 'Join Group',
    
    // Groups
    groupName: 'Group Name',
    groupEmoji: 'Group Emoji',
    contributionAmount: 'Contribution Amount',
    cycleLength: 'Cycle Length',
    maxMembers: 'Max Members',
    createNewGroup: 'Create New Group',
    groupDetails: 'Group Details',
    members: 'Members',
    cycles: 'Cycles',
    chat: 'Chat',
    admin: 'Admin',
    timeline: 'Timeline',
    penalty: 'Penalty',
    
    // Payments
    pendingPayments: 'Pending Payments',
    paymentHistory: 'Payment History',
    amount: 'Amount',
    dueDate: 'Due Date',
    status: 'Status',
    paid: 'Paid',
    failed: 'Failed',
    late: 'Late',
    onTime: 'On Time',
    paymentMethod: 'Payment Method',
    mobileMoney: 'Mobile Money',
    bankTransfer: 'Bank Transfer',
    
    // Profile
    myProfile: 'My Profile',
    personalInfo: 'Personal Information',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    memberSince: 'Member Since',
    trustScore: 'Trust Score',
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    language: 'Language',
    settings: 'Settings',
    
    // Goals
    savingsGoals: 'Savings Goals',
    createGoal: 'Create Goal',
    goalName: 'Goal Name',
    targetAmount: 'Target Amount',
    targetDate: 'Target Date',
    currentProgress: 'Current Progress',
    completed: 'Completed',
    active: 'Active',
    paused: 'Paused',
    progress: 'Progress',
    
    // Analytics
    analytics: 'Analytics',
    totalSaved: 'Total Saved',
    averageMonthly: 'Average Monthly',
    onTimeRate: 'On-Time Rate',
    groupsCompleted: 'Groups Completed',
    paymentStreak: 'Payment Streak',
    monthStreak: 'Month Streak',
    consecutivePayments: 'Consecutive on-time payments',
    monthlySavings: 'Monthly Savings',
    last6Months: 'Last 6 Months',
    contributionsByGroup: 'Contributions by Group',
    savingsProgress: 'Savings Progress',
    overTime: 'Over Time',
    recentPaymentHistory: 'Recent Payment History',
    noDataAvailable: 'No data available',
    
    // Errors
    genericError: 'Something went wrong',
    networkError: 'Network error',
    serverError: 'Server error',
    authenticationError: 'Authentication error',
    validationError: 'Validation error',
    notFound: 'Not found',
    accessDenied: 'Access denied',
    
    // Success Messages
    paymentProcessed: 'Payment processed successfully',
    goalCreated: 'Goal created successfully',
    goalUpdated: 'Goal updated successfully',
    goalDeleted: 'Goal deleted successfully',
    groupCreated: 'Group created successfully',
    profileUpdated: 'Profile updated successfully',
    
    // Form Validation
    required: 'This field is required',
    invalidEmail: 'Invalid email address',
    invalidPhone: 'Invalid phone number',
    passwordTooShort: 'Password must be at least 8 characters',
    passwordsDontMatch: 'Passwords do not match',
    amountTooLow: 'Amount must be greater than 0',
    dateRequired: 'Date is required',
    
    // Common Actions
    accept: 'Accept',
    decline: 'Decline',
    approve: 'Approve',
    reject: 'Reject',
    join: 'Join',
    leave: 'Leave',
    invite: 'Invite',
    share: 'Share',
    copy: 'Copy',
    export: 'Export',
    import: 'Import',
    
    // Time
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    lastWeek: 'Last Week',
    lastMonth: 'Last Month',
    lastYear: 'Last Year',
    
    // Numbers
    zero: 'Zero',
    one: 'One',
    two: 'Two',
    three: 'Three',
    four: 'Four',
    five: 'Five',
    many: 'Many',
  },
  
  rw: {
    // Common
    welcome: 'Murakaza neza',
    saveTogether: 'Rindira hamwe',
    loading: 'Ibirimo...',
    error: 'Ikosa',
    success: 'Ibyashize',
    cancel: 'Kuraho',
    confirm: 'Emeza',
    save: 'Bika',
    delete: 'Siba',
    edit: 'Hindura',
    create: 'Tunganya',
    update: 'Hindura',
    close: 'Funika',
    back: 'Inyuma',
    next: 'Komeza',
    done: 'Byaranzwe',
    retry: 'Subiramo nandi',
    search: 'Shakisha',
    filter: 'Muyunguruzi',
    sort: 'Itonde',
    refresh: 'Kongera imiterere',
    
    // Navigation
    home: 'Ahabanza',
    groups: 'Amatsinda',
    payments: 'Amahurizo',
    profile: 'Ibijyanye njanwe',
    notifications: 'Amakuru',
    analytics: 'Ibyifashishwa',
    goals: 'Intego',
    
    // Auth
    signIn: 'Injira',
    signUp: 'Iyandikishe',
    signOut: 'Tangira',
    phone: 'Telefoni',
    password: 'Ijambo banga',
    forgotPassword: 'Wibagiwe ijambo ryo banga?',
    resetPassword: 'Ongera usubire ijambo ryo banga',
    createAccount: 'Tunganya konti',
    alreadyHaveAccount: 'Urafite konti?',
    dontHaveAccount: 'Nta konti ufite?',
    
    // Dashboard
    greeting: 'Muraho, {{name}} 👋',
    welcomeBack: 'Murakaza neza ku nzira yawe yo kurinda',
    totalContributed: 'Byose wushyizeho',
    activeGroups: 'Amatsinda akora',
    pending: 'Ari kubikwa',
    paymentDue: 'Ushyiraho umwanzuro',
    paymentDueMessage: 'Wafite {{count}} amahurizo ari kubikwa',
    payNow: 'Haha unga',
    myGroups: 'Amatsinda yanjye',
    noGroups: 'Nta matsinda ariho',
    createGroup: 'Tunganya itsinda',
    joinGroup: 'Injira muri itsinda',
    
    // Groups
    groupName: 'Izina ryitsinda',
    groupEmoji: 'Ikimenyetso cyitsinda',
    contributionAmount: 'Igiteranyo cyishyirwa',
    cycleLength: 'Uburebure bwikihingwa',
    maxMembers: 'Abanyamuryango bacye',
    createNewGroup: 'Tunganya itsinda rishya',
    groupDetails: 'Ibisobanuro byitsinda',
    members: 'Abanyamuryango',
    cycles: 'Ibihingwa',
    chat: 'Ubutumwa',
    admin: 'Ubuyobozi',
    timeline: 'Ibihe',
    penalty: 'Ihuriro',
    
    // Payments
    pendingPayments: 'Amahurizo ari kubikwa',
    paymentHistory: 'Amateka yahurizo',
    amount: 'Igiteranyo',
    dueDate: 'Itariki yo kuhemba',
    status: 'Imimerere',
    paid: 'Yashyizweho',
    failed: 'Byanze',
    late: 'Bigeze igihe',
    onTime: 'Bigeze igihe',
    paymentMethod: 'Uburyo bwo kwishyura',
    mobileMoney: 'Mobile Money',
    bankTransfer: 'Ukwihinduranya muri banki',
    
    // Profile
    myProfile: 'Ibijyanye njanwe',
    personalInfo: 'Amakuru yibijyanye njanwe',
    name: 'Izina',
    email: 'Imeri',
    phone: 'Telefoni',
    memberSince: 'Umuhanzi kuva',
    trustScore: 'Uburyo bwukwumva',
    excellent: 'Byiza cyane',
    good: 'Byiza',
    fair: 'Bisanzwe',
    poor: 'Bya nabi',
    language: 'Ururimi',
    settings: 'Igenamiterere',
    
    // Goals
    savingsGoals: 'Intego zo kurinda',
    createGoal: 'Tunganya intego',
    goalName: 'Izina ryintego',
    targetAmount: 'Igiteranyo cyintego',
    targetDate: 'Itariki yo gukora',
    currentProgress: 'Aho wigeze',
    completed: 'Byaranzwe',
    active: 'Ikora',
    paused: 'Bihagaze',
    progress: 'Aho wigeze',
    
    // Analytics
    analytics: 'Ibyifashishwa',
    totalSaved: 'Byose wabitswe',
    averageMonthly: 'Buri kwezi',
    onTimeRate: 'Ijanjya ryigihe',
    groupsCompleted: 'Amatsinda yarangije',
    paymentStreak: 'Ushyiraho umwanzuro',
    monthStreak: 'Ushyiraho umwanzuro bwa kwezi',
    consecutivePayments: 'Amahurizo akurikiranye bigeze igihe',
    monthlySavings: 'Kurinda buri kwezi',
    last6Months: 'Amezi 6 ashize',
    contributionsByGroup: 'Amahurizo mu matsinda',
    savingsProgress: 'Aho wigeze mu kurinda',
    overTime: 'Mugihe',
    recentPaymentHistory: 'Amateka yahurizo hafi',
    noDataAvailable: 'Nta data iboneka',
    
    // Errors
    genericError: 'Bikabije Icyo ari ikintu cyose',
    networkError: 'Ikosa ryurusobe',
    serverError: 'Ikosa rya seriveri',
    authenticationError: 'Ikosa ryigenekerezo',
    validationError: 'Ikosa ryukugenzura',
    notFound: 'Ntabonetse',
    accessDenied: 'Ntushoboye kwinjira',
    
    // Success Messages
    paymentProcessed: 'Ushyiraho umwanzuro rwagenze neza',
    goalCreated: 'Intego yarangije gukora',
    goalUpdated: 'Intego yahinduwe neza',
    goalDeleted: 'Intego yasibwe neza',
    groupCreated: 'Itsinda ryarangije gukora',
    profileUpdated: 'Ibijyanye njanwe byahinduwe neza',
    
    // Form Validation
    required: 'Iki kintu ni ngombwa',
    invalidEmail: 'Aderesi idahwitse ya imeyili',
    invalidPhone: 'Nomero ya telefoni idahwitse',
    passwordTooShort: 'Ijambo banga rigira kuba rinaniye ku mabwiriza 8',
    passwordsDontMatch: 'Amagambo banga atagira imwe',
    amountTooLow: 'Igiteranyo kigira kuba kinini ku 0',
    dateRequired: 'Itariki ngombwa',
    
    // Common Actions
    accept: 'Emeza',
    decline: 'Kuraho',
    approve: 'Emeza',
    reject: 'Kuraho',
    join: 'Injira',
    leave: 'Tangira',
    invite: 'Tangiza',
    share: 'Kugabanyisha',
    copy: 'Gukoporora',
    export: 'Koherezwa',
    import: 'Kuzana',
    
    // Time
    today: 'Uyu munsi',
    yesterday: 'Ejo',
    thisWeek: 'Icyumweru cya none',
    thisMonth: 'Ukwezi guto',
    thisYear: 'Umwaka uto',
    lastWeek: 'Icyumweru cya shize',
    lastMonth: 'Ukwezi gwa shize',
    lastYear: 'Umwaka wa shize',
    
    // Numbers
    zero: 'Zeru',
    one: 'Kimwe',
    two: 'Kabiri',
    three: 'Gatatu',
    four: 'Kane',
    five: 'Gatanu',
    many: 'Byinshi',
  }
};

I18n.translations = translations;

// Helper function to get current locale
export const getCurrentLocale = () => I18n.locale;

// Helper function to set locale
export const setLocale = (locale: string) => {
  I18n.locale = locale;
};

// Helper function to translate
export const t = (key: string, options?: any) => {
  return I18n.t(key, options);
};

// Available languages
export const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Kinyarwanda' }
];

export default I18n;
