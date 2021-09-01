import { Border } from "./types.ts";

export type Config = {
  documentation: DocConfig;
  signature: SignatureConfig;
};

export type CommonConfig = {
  enable: boolean;
  border: Border;
  maxWidth: number;
  maxHeight: number;
};

export type DocConfig = CommonConfig & {/* delay */};

export type SignatureConfig = CommonConfig & {};
