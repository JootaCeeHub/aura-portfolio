declare module './configService.js' {
  export const configEvents: any;
  export const configService: {
    load(): Promise<any | null>;
    getConfig(): any;
    save(cfg: any, user?: string): Promise<void>;
    listSnapshots(): Promise<Array<{ file: string; createdAt: string; createdBy?: string }>>;
    restore(file: string): Promise<any>;
  };
  export default configService;
}
