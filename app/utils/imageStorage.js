// app/utils/imageStorage.js
// Safe, efficient client-side image compression for LocalStorage

export function compressAvatarImage(file, maxSize = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return reject(new Error('សូមជ្រើសរើសតែ file រូបភាពប៉ុណ្ណោះ!'));
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('មិនអាចដំណើរការរូបភាពបានទេ'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('មិនអាចអាន file រូបភាពបានទេ'));
    reader.readAsDataURL(file);
  });
}

// Safely save avatar to localStorage without quota errors
export function saveAvatarToStorage(dataUrl) {
  try {
    if (typeof window !== 'undefined' && dataUrl) {
      localStorage.setItem('chatbot_avatar', dataUrl);
      return true;
    }
  } catch (err) {
    console.warn('[Storage] Failed to save avatar:', err);
  }
  return false;
}

export const DEFAULT_USER_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=Student';

// Safely get avatar from localStorage
export function getAvatarFromStorage(defaultAvatar = DEFAULT_USER_AVATAR) {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatbot_avatar') || defaultAvatar;
    }
  } catch {}
  return defaultAvatar;
}

// Safely remove user avatar from localStorage
export function removeAvatarFromStorage() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chatbot_avatar');
      return true;
    }
  } catch (err) {
    console.warn('[Storage] Failed to remove avatar:', err);
  }
  return false;
}
