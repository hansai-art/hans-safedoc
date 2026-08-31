export type StandaloneSchemaValidator = ((value: unknown) => value is Record<string, unknown>) & {
  errors?: readonly unknown[] | null;
};
export const validateStore: StandaloneSchemaValidator;
export const validateClientProfile: StandaloneSchemaValidator;
export const validateJob: StandaloneSchemaValidator;
export const validateCandidate: StandaloneSchemaValidator;
export const validateExportManifest: StandaloneSchemaValidator;
export const validateResultPackage: StandaloneSchemaValidator;
export const validateDictionaryRecord: StandaloneSchemaValidator;
export const validateEncryptedEnvelope: StandaloneSchemaValidator;
