import { FOLDER_ID_KEY } from './sheets/constants';
import authMethods from './sheets/auth';
import boardMethods from './sheets/boards';
import appPropertiesMethods from './sheets/appProperties';
import taskMethods from './sheets/tasks';
import commentMethods from './sheets/comments';
import relationshipMethods from './sheets/relationships';
import categoryMethods from './sheets/categories';
import labelMethods from './sheets/labels';
import epicMethods from './sheets/epics';
import sharingMethods from './sheets/sharing';

class SheetsService {
  constructor() {
    this.accessToken = null;
    this.appFolderId = null;
    this.userEmail = null;
    this.folderStorageKey = FOLDER_ID_KEY;
  }
}

Object.assign(
  SheetsService.prototype,
  authMethods,
  boardMethods,
  appPropertiesMethods,
  taskMethods,
  commentMethods,
  relationshipMethods,
  categoryMethods,
  labelMethods,
  epicMethods,
  sharingMethods,
);

export default new SheetsService();
