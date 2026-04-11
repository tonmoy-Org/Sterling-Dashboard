import { UAParser } from 'ua-parser-js';
import { format as formatTZ, toZonedTime } from 'date-fns-tz';

const TIME_ZONE = 'America/Los_Angeles';

const getDeviceInfo = () => {
  const parser = new UAParser();
  const result = parser.getResult();


  let deviceId = localStorage.getItem('deviceId');

  if (!deviceId) {
    const rawId = `${result.browser.name}-${result.browser.version}-${result.os.name}-${navigator.userAgent}`;
    deviceId = btoa(rawId);
    localStorage.setItem('deviceId', deviceId);
  }

  const now = new Date();
  const zonedDate = toZonedTime(now, TIME_ZONE);

  return {
    deviceId,
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || 'Unknown',
    os: result.os.name || 'Unknown',
    osVersion: result.os.version || 'Unknown',
    deviceType: result.device.type || 'Desktop',

    // formatted time in GMT-8
    date: formatTZ(zonedDate, 'yyyy-MM-dd HH:mm:ssXXX', {
      timeZone: TIME_ZONE,
    }),
  };
};

export default getDeviceInfo;
