import { OverlayContainer } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';
import { Device } from '@ionic-native/device/ngx';
import { ThemeDetection, ThemeDetectionResponse } from '@ionic-native/theme-detection/ngx';
import { Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { TranslateService } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';
import { ScanRecord } from '../models/scan-record';

@Injectable({
  providedIn: 'root'
})
export class EnvService {

  public languages: string[] = ['en', 'zh-HK'];
  public language: 'en' | 'zh-HK' = 'en';
  public selectedLanguage: 'default' | 'en' | 'zh-HK' = 'default';
  public colorTheme: 'light' | 'dark' = 'light';
  public selectedColorTheme: 'default' | 'light' | 'dark' = 'default';
  public cameraPauseTimeout: 0 | 5 | 10 | 20 | 30 = 10;
  public scanRecordLogging: 'on' | 'off' = 'on';

  public readonly APP_FOLDER_NAME: string = 'SimpleQR';
  public readonly WEB_SEARCH_URL: string = "https://www.google.com/search?q=";
  public readonly GITHUB_REPO_URL: string = "https://github.com/tomfong/simple-qr";

  private _storage: Storage | null = null;
  private _scannedData: string = '';
  private _scanRecords: ScanRecord[] = [];

  constructor(
    private platform: Platform,
    private storage: Storage,
    public translate: TranslateService,
    private overlayContainer: OverlayContainer,
    private themeDetection: ThemeDetection,
    private device: Device,
  ) {
    this.platform.ready().then(
      async () => {
        await this.init();
      }
    )
  }

  private async init() {
    const storage = await this.storage.create();
    this._storage = storage;
    await this.storageGet("language").then(
      async value => {
        if (value !== null && value !== undefined) {
          this.selectedLanguage = value;
        } else {
          this.selectedLanguage = 'default';
        }
        this.toggleLanguageChange();
      }
    );
    await this.storageGet("color").then(
      async value => {
        if (value !== null && value !== undefined) {
          this.selectedColorTheme = value;
        } else {
          this.selectedColorTheme = 'default';
        }
        await this.toggleColorTheme();
      }
    );
    await this.storageGet("camera-pause-timeout").then(
      value => {
        if (value !== null && value !== undefined) {
          this.cameraPauseTimeout = value;
        } else {
          this.cameraPauseTimeout = 10;
        }
      }
    );
    await this.storageGet("scan-record-logging").then(
      value => {
        if (value !== null && value !== undefined) {
          this.scanRecordLogging = value;
        } else {
          this.scanRecordLogging = 'on';
        }
      }
    );
    await this.storageGet(environment.storageScanRecordKey).then(
      value => {
        if (value !== null && value !== undefined) {
          try {
            this._scanRecords = JSON.parse(value);
            this._scanRecords.forEach(
              r => {
                const tCreatedAt = r.createdAt;
                r.createdAt = new Date(tCreatedAt);
              }
            );
            this._scanRecords.sort((r1, r2) => {
              return r2.createdAt.getTime() - r1.createdAt.getTime();
            });
          } catch (err) {
            console.error(err);
            this._scanRecords = [];
          }
        }
      }
    );
  }

  public async storageSet(key: string, value: any) {
    await this._storage?.set(key, value);
  }

  public async storageGet(key: string): Promise<any> {
    const value = await this._storage?.get(key).then(
      value => {
        return value;
      },
      err => {
        console.error("error when get from storage", err);
        return null;
      }
    );
    return value;
  }

  get result(): string {
    return this._scannedData;
  }

  set result(value: string) {
    this._scannedData = value;
  }

  // get baseDir(): string {
  //   let baseDir: string;
  //   if (this.platform.is('android')) {
  //     baseDir = this.file.externalDataDirectory;
  //   } else {
  //     baseDir = this.file.dataDirectory;
  //   }
  //   return baseDir;
  // }

  get scanRecords(): ScanRecord[] {
    return this._scanRecords;
  }

  async saveScanRecord(value: string): Promise<void> {
    const record = new ScanRecord();
    const date = new Date();
    record.id = String(date.getTime());
    record.text = value;
    record.createdAt = date;
    this._scanRecords.unshift(record);
    await this.storageSet(environment.storageScanRecordKey, JSON.stringify(this._scanRecords));
  }

  async undoScanRecordDeletion(record: ScanRecord): Promise<void> {
    this._scanRecords.push(record);
    this._scanRecords.sort((r1, r2) => {
      return r2.createdAt.getTime() - r1.createdAt.getTime();
    });
    await this.storageSet(environment.storageScanRecordKey, JSON.stringify(this._scanRecords));
  }

  async deleteScanRecord(recordId: string): Promise<void> {
    const index = this._scanRecords.findIndex(r => r.id === recordId);
    if (index !== -1) {
      this._scanRecords.splice(index, 1);
      await this.storageSet(environment.storageScanRecordKey, JSON.stringify(this._scanRecords));
    }
  }

  async deleteAllScanRecords(): Promise<void> {
    this._scanRecords = [];
    await this.storageSet(environment.storageScanRecordKey, JSON.stringify(this._scanRecords));
  }

  toggleLanguageChange() {
    if (this.selectedLanguage === 'default') {
      let language = 'en';
      const browserLang = this.translate.getBrowserCultureLang();
      if (browserLang.includes("zh", 0)) {
        language = "zh-HK";
      } else if (this.languages.includes(browserLang)) {
        language = browserLang as 'en' | 'zh-HK';
      } else {
        language = 'en';
      }
      this.translate.use(language);
      this.language = language as 'en' | 'zh-HK';
    } else {
      this.translate.use(this.selectedLanguage);
      this.language = this.selectedLanguage;
    }
  }

  async toggleColorTheme(): Promise<void> {
    console.log("toggle color!")
    if (this.selectedColorTheme === 'default') {
      const version = Number(this.device.version.split(".")[0]);
      if (this.platform.is("android") && version <= 9) {  // Android 9 or below
        this.colorTheme = 'light';
        document.body.classList.toggle('dark', false);
        this.overlayContainer.getContainerElement().classList.remove('ng-mat-dark');
        this.overlayContainer.getContainerElement().classList.add('ng-mat-light');
      } else {
        await this.themeDetection.isAvailable().then( // Android 10 or above
          async (res: ThemeDetectionResponse) => {
            if (res.value) {
              await this.themeDetection.isDarkModeEnabled().then((res: ThemeDetectionResponse) => {
                if (res.value) {
                  this.colorTheme = 'dark';
                  document.body.classList.toggle('dark', true);
                  this.overlayContainer.getContainerElement().classList.remove('ng-mat-light');
                  this.overlayContainer.getContainerElement().classList.add('ng-mat-dark');
                } else {
                  this.colorTheme = 'light';
                  document.body.classList.toggle('dark', false);
                  this.overlayContainer.getContainerElement().classList.remove('ng-mat-dark');
                  this.overlayContainer.getContainerElement().classList.add('ng-mat-light');
                }
              }).catch((error: any) => console.error(error));
            } else {
              this.colorTheme = 'light';
              document.body.classList.toggle('dark', false);
              this.overlayContainer.getContainerElement().classList.remove('ng-mat-dark');
              this.overlayContainer.getContainerElement().classList.add('ng-mat-light');
            }
          }
        )
      }
    } else if (this.selectedColorTheme === 'light') {
      this.colorTheme = 'light';
      document.body.classList.toggle('dark', false);
      this.overlayContainer.getContainerElement().classList.remove('ng-mat-dark');
      this.overlayContainer.getContainerElement().classList.add('ng-mat-light');
    } else if (this.selectedColorTheme === 'dark') {
      this.colorTheme = 'dark';
      document.body.classList.toggle('dark', true);
      this.overlayContainer.getContainerElement().classList.remove('ng-mat-light');
      this.overlayContainer.getContainerElement().classList.add('ng-mat-dark');
    }
  }
}
