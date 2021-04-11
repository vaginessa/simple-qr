import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, Platform } from '@ionic/angular';
import { EnvService } from 'src/app/services/env.service';

@Component({
  selector: 'app-setting',
  templateUrl: './setting.page.html',
  styleUrls: ['./setting.page.scss'],
})
export class SettingPage {

  constructor(
    private platform: Platform,
    public alertController: AlertController,
    public loadingController: LoadingController,
    private router: Router,
    public env: EnvService,
  ) { 
    
  }

  setLanguage() {
    this.router.navigate(['setting-language', { t: new Date().getTime() }]);
  }

  setColorTheme() {
    this.router.navigate(['setting-color', { t: new Date().getTime() }]);
  }

}
