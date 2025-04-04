import * as React from "react";
import {
  GridProps,
  SelectFieldProps,
  TextFieldProps,
  FlexProps,
  ButtonProps
} from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
  [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
  [key: string]: string;
};
export declare type Variant = {
  variantValues: VariantValues;
  overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
  hasError: boolean;
  errorMessage?: string;
};
export declare type ValidationFunction<T> = (
  value: T,
  validationResponse: ValidationResponse,
  context?: QChatRequestCreateFormInputValues,
) => ValidationResponse | Promise<ValidationResponse>;
export declare type QChatRequestCreateFormInputValues = {
  customer?: string;
  website?: string;
  additional_sites?: string[];
  chatbotname?: string;
  chatbot_logo_url?: string;
  initial_text?: string;
  guardrails?: string;
  acceptTnC?: boolean;
  regionQ?: string;
  useAgent?: boolean;
  agentDescription?: string;
  openApiSchema?: string | object; // Allow both string and object types
};
export declare type QChatRequestCreateFormValidationValues = {
  customer?: ValidationFunction<string>;
  website?: ValidationFunction<string>;
  additional_sites?: ValidationFunction<string>;
  chatbotname?: ValidationFunction<string>;
  chatbot_logo_url?: ValidationFunction<string>;
  initial_text?: ValidationFunction<string>;
  guardrails?: ValidationFunction<string>;
  acceptTnC?: ValidationFunction<boolean>;
  regionQ?: ValidationFunction<string>;
  useAgent?: ValidationFunction<boolean>;
  agentDescription?: ValidationFunction<string>;
  openApiSchema?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> &
  React.DOMAttributes<HTMLDivElement>;
  export declare type QChatRequestCreateFormOverridesProps = {
    QChatRequestCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    customer?: PrimitiveOverrideProps<TextFieldProps>;
    website?: PrimitiveOverrideProps<TextFieldProps>;
    additional_sites?: PrimitiveOverrideProps<TextFieldProps>;
    chatbotname?: PrimitiveOverrideProps<TextFieldProps>;
    chatbot_logo_url?: PrimitiveOverrideProps<TextFieldProps>;
    initial_text?: PrimitiveOverrideProps<TextFieldProps>;
    guardrails?: PrimitiveOverrideProps<TextFieldProps>;
    acceptTnC?: PrimitiveOverrideProps<SwitchFieldProps>;
    regionQ?: PrimitiveOverrideProps<SelectFieldProps>;
    useAgent?: PrimitiveOverrideProps<SwitchFieldProps>;
    agentDescription?: PrimitiveOverrideProps<TextFieldProps>;
    openApiSchema?: PrimitiveOverrideProps<TextFieldProps>;
    openApiSchemaContainer?: PrimitiveOverrideProps<FlexProps>;
    createSchemaButton?: PrimitiveOverrideProps<ButtonProps>;
  } & EscapeHatchProps;
export declare type QChatRequestCreateFormProps = React.PropsWithChildren<
  {
    overrides?: QChatRequestCreateFormOverridesProps | undefined | null;
  } & {
    clearOnSuccess?: boolean;
    onSubmit?: (
      fields: QChatRequestCreateFormInputValues,
    ) => QChatRequestCreateFormInputValues;
    onSuccess?: (fields: QChatRequestCreateFormInputValues) => void;
    onError?: (
      fields: QChatRequestCreateFormInputValues,
      errorMessage: string,
    ) => void;
    onChange?: (
      fields: QChatRequestCreateFormInputValues,
    ) => QChatRequestCreateFormInputValues;
    onValidate?: QChatRequestCreateFormValidationValues;
  } & React.CSSProperties
>;
export default function QChatRequestCreateForm(
  props: QChatRequestCreateFormProps,
): React.ReactElement;
