import { SHEET_TABS, TASK_HEADERS, DEFAULT_CATEGORIES, DEFAULT_STATUSES } from '../../constants/defaults';

export const SPREADSHEET_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';
export const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
export const APP_FOLDER_NAME = 'TaskTracker';
export const FILE_PREFIX = 'TaskTracker - ';
export const FOLDER_ID_KEY = 'task_tracker_folder_id';
export const APP_PROPERTY_KEY = 'taskTracker';
export const APP_PROPERTY_VALUE = 'true';
// Use 'properties' (public) not 'appProperties' (private per-user) so shared users can see the tag
export const APP_PROPERTY_QUERY = `properties has { key='${APP_PROPERTY_KEY}' and value='${APP_PROPERTY_VALUE}' }`;
export const APP_FOLDER_COLOR = '#1F4E79';

export {
  SHEET_TABS,
  TASK_HEADERS,
  DEFAULT_CATEGORIES,
  DEFAULT_STATUSES,
};
