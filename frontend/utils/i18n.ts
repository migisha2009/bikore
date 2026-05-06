import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

const translations = {
  en: {
    welcome: 'Welcome',
    saveTogether: 'Save Together, Grow Together',
    home: 'Home',
    groups: 'Groups',
    payments: 'Payments',
    profile: 'Profile',
    notifications: 'Notifications',
    analytics: 'Analytics',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    phone: 'Phone Number',
    password: 'Password',
    name: 'Full Name',
    createAccount: 'Create Account',
    myGroups: 'My Groups',
    createGroup: 'Create Group',
    joinGroup: 'Join Group',
    totalSaved: 'Total Saved',
    activeGroups: 'Active Groups',
    pending: 'Pending',
    payNow: 'Pay Now',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
  },
  rw: {
    welcome: 'Murakaza neza',
    saveTogether: 'Rindira hamwe, Gukura hamwe',
    home: 'Ahabanza',
    groups: 'Amatsinda',
    payments: 'Ubwishyu',
    profile: 'Umwirondoro',
    notifications: 'Amakuru',
    analytics: 'Ibyifashishwa',
    login: 'Injira',
    register: 'Iyandikishe',
    logout: 'Sohoka',
    phone: 'Nimero ya telefoni',
    password: 'Ijambobanga',
    name: 'Amazina yose',
    createAccount: 'Fungura konti',
    myGroups: 'Amatsinda yanjye',
    createGroup: 'Shiraho itsinda',
    joinGroup: 'Injira mu itsinda',
    totalSaved: 'Byose byabitswe',
    activeGroups: 'Amatsinda akora',
    pending: 'Bitegereje',
    payNow: 'Ishyura nonaha',
    confirm: 'Emeza',
    cancel: 'Reka',
    save: 'Bika',
    loading: 'Gutegereza...',
    error: 'Ikosa',
    success: 'Byagenze neza',
  },
};

const i18n = new I18n(translations);
i18n.defaultLocale = 'en';
i18n.locale = Localization.getLocales()[0]?.languageCode ?? 'en';
i18n.enableFallback = true;

export const getCurrentLocale = () => i18n.locale;
export const setLocale = (locale: string) => { i18n.locale = locale; };
export const t = (key: string, options?: object) => i18n.t(key, options);
export const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Kinyarwanda' }
];
export default i18n;
