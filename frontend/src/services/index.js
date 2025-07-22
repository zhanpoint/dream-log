import api from './api/index';
import { auth } from './auth';
import notificationService from './notification';
import ossUploadService from './oss';

export { api };
export { auth };
export { notificationService };
export { ossUploadService };

export const sms = notificationService.sms;

export default {
    api,
    auth,
    notification: notificationService,
    oss: ossUploadService,
    sms
}; 