/* Ambient module shims to silence TS errors for third-party libs without types.
   Extend this file if other modules appear in diagnostics.
*/

declare module 'ws' {
  import WebSocket from 'ws';
  const ws: any;
  export = ws;
}

declare module 'pdfreader' {
  const content: any;
  export = content;
}

declare module 'pdfjs-dist' {
  const content: any;
  export = content;
}

declare module 'chokidar' {
  const chokidar: any;
  export default chokidar;
}

declare module 'pdf-parse' {
  const parse: any;
  export default parse;
}

declare module '@modelcontextprotocol/sdk/*' {
  const whatever: any;
  export = whatever;
}

declare module 'pdf2json' {
  const whatever: any;
  export = whatever;
}

declare module 'swagger-parser' {
  const whatever: any;
  export default whatever;
}

declare module 'express' {
  import http = require('http');
  function express(): any;
  namespace express {
    export interface Request { [key: string]: any }
    export interface Response { [key: string]: any }
    export interface NextFunction { (err?: any): void }
  }
  export = express;
}

declare module 'helmet' { const h: any; export default h; }
declare module 'winston' { const w: any; export default w; }
declare module 'pdfreader' { const p: any; export default p; }
declare module 'sharp' { const s: any; export default s; }

/* Vitest shims */
declare module 'vitest' {
  const vitest: any;
  export = vitest;
}
declare module 'vitest/config' {
  const cfg: any;
  export default cfg;
}

/* Allow importing JSON without errors */
declare module '*.json' {
  const value: any;
  export default value;
}
