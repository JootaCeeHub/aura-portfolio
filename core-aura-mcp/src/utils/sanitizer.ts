export const Sanitizer = {
  clean(text: string) {
    return text.replace(/\s+/g, ' ').replace(/[^\x20-\x7E¡-ÿ]/g, '');
  },
};
