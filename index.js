import 'react-native-url-polyfill/auto';

// Polyfill DOMRect before any module loads
if (typeof global.DOMRect === 'undefined') {
  global.DOMRect = function DOMRect(x, y, width, height) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
    this.top = this.y;
    this.left = this.x;
    this.right = this.x + this.width;
    this.bottom = this.y + this.height;
  };
}

if (typeof global.DOMPoint === 'undefined') {
  global.DOMPoint = function DOMPoint(x, y, z, w) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w || 1;
  };
}

import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
