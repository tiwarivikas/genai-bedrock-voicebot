import * as React from "react";
import { GridProps, SelectFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
import { QChatRequest } from "./graphql/types";
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
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type QChatRequestUpdateFormInputValues = {
    customer?: string;
    website?: string;
    additional_sites?: string[];
    chatbotname?: string;
    chatbot_logo_url?: string;
    initial_text?: string;
    guardrails?: string;
    docs?: string[];
    token?: string;
    bot_status?: string;
    qchatform_status?: string;
    expiry_datetime?: string;
    requester_email?: string;
};
export declare type QChatRequestUpdateFormValidationValues = {
    customer?: ValidationFunction<string>;
    website?: ValidationFunction<string>;
    additional_sites?: ValidationFunction<string>;
    chatbotname?: ValidationFunction<string>;
    chatbot_logo_url?: ValidationFunction<string>;
    initial_text?: ValidationFunction<string>;
    guardrails?: ValidationFunction<string>;
    docs?: ValidationFunction<string>;
    token?: ValidationFunction<string>;
    bot_status?: ValidationFunction<string>;
    qchatform_status?: ValidationFunction<string>;
    expiry_datetime?: ValidationFunction<string>;
    requester_email?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type QChatRequestUpdateFormOverridesProps = {
    QChatRequestUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    customer?: PrimitiveOverrideProps<TextFieldProps>;
    website?: PrimitiveOverrideProps<TextFieldProps>;
    additional_sites?: PrimitiveOverrideProps<TextFieldProps>;
    chatbotname?: PrimitiveOverrideProps<TextFieldProps>;
    chatbot_logo_url?: PrimitiveOverrideProps<TextFieldProps>;
    initial_text?: PrimitiveOverrideProps<TextFieldProps>;
    guardrails?: PrimitiveOverrideProps<TextFieldProps>;
    docs?: PrimitiveOverrideProps<TextFieldProps>;
    token?: PrimitiveOverrideProps<TextFieldProps>;
    bot_status?: PrimitiveOverrideProps<SelectFieldProps>;
    qchatform_status?: PrimitiveOverrideProps<SelectFieldProps>;
    expiry_datetime?: PrimitiveOverrideProps<TextFieldProps>;
    requester_email?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type QChatRequestUpdateFormProps = React.PropsWithChildren<{
    overrides?: QChatRequestUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    qChatRequest?: QChatRequest;
    onSubmit?: (fields: QChatRequestUpdateFormInputValues) => QChatRequestUpdateFormInputValues;
    onSuccess?: (fields: QChatRequestUpdateFormInputValues) => void;
    onError?: (fields: QChatRequestUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: QChatRequestUpdateFormInputValues) => QChatRequestUpdateFormInputValues;
    onValidate?: QChatRequestUpdateFormValidationValues;
} & React.CSSProperties>;
export default function QChatRequestUpdateForm(props: QChatRequestUpdateFormProps): React.ReactElement;
