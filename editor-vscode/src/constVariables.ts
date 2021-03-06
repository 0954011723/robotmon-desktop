
export enum Message {
  notifyOpenFolder = "Please open a folder",
  notifyNoEditor = "No text editor found",
  notifyScriptEmpty = "Script is empty",
  deviceBusy = "Device is busy",
  screenshotSuccess = "Screenshot success",
  screenshotFailure = "Screenshot failure",
  runScriptSuccess = "Run script success",
  runScriptFailure = "Run script failure",
  stopScriptSuccess = "Stop script success",
  stopScriptFailure = "Stop script failure",
  pauseScriptSuccess = "Pause script success",
  pauseScriptFailure = "Pause script failure",
  resumeScriptSuccess = "Resume script success",
  resumeScriptFailure = "Resume script failure",
  createNewSettingFile = "New robotmon-settings.json file created",
  robotmonSettingsFilename = "robotmon-settings.json",
  parseSettingsError = "Can not parse robotmon-settings.json",
  parseSettingsSuccess = "Reload robotmon-settings.json success",
  adbPathNotFound = "ADB file not found. Please set adbPath in robotmon-settings.json",
  apkPathNotFound = "Error: apk path not found on phone, please check to whether Robotmon is installed",
  appProcessNotFound = "Error: app_process not found on phone",
  libPathNotFound = "Error: lib path not found on phone",
  startServiceFailure = "Start robotmon service failure",
  startServiceSuccess = "Robotmon Service started",
  serviceStarted = "Started",
  serviceStopped = "Stopped",
}

export const NotFound = -1;
export const ImageExtenstions = ['.png', '.jpg', '.jpeg', '.bmp'];
export const ADBDownloadURL = {
  "windows": "https://s3-ap-northeast-1.amazonaws.com/robotmon.elggum.com/adb/windows_adb.zip",
  "darwin": "https://s3-ap-northeast-1.amazonaws.com/robotmon.elggum.com/adb/darwin_adb.zip",
  "linux": "https://s3-ap-northeast-1.amazonaws.com/robotmon.elggum.com/adb/linux_adb.zip",
};