/* eslint-disable */
"use client";
import * as React from "react";
import {
  Badge,
  Button,
  Divider,
  Flex,
  Grid,
  Icon,
  ScrollView,
  SelectField,
  Text,
  TextField,
  useTheme,
} from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { generateClient } from "aws-amplify/api";
import { getQChatRequest } from "./graphql/queries";
import { updateQChatRequest } from "./graphql/mutations";
const client = generateClient();
function ArrayField({
  items = [],
  onChange,
  label,
  inputFieldRef,
  children,
  hasError,
  setFieldValue,
  currentFieldValue,
  defaultFieldValue,
  lengthLimit,
  getBadgeText,
  runValidationTasks,
  errorMessage,
}) {
  const labelElement = <Text>{label}</Text>;
  const {
    tokens: {
      components: {
        fieldmessages: { error: errorStyles },
      },
    },
  } = useTheme();
  const [selectedBadgeIndex, setSelectedBadgeIndex] = React.useState();
  const [isEditing, setIsEditing] = React.useState();
  React.useEffect(() => {
    if (isEditing) {
      inputFieldRef?.current?.focus();
    }
  }, [isEditing]);
  const removeItem = async (removeIndex) => {
    const newItems = items.filter((value, index) => index !== removeIndex);
    await onChange(newItems);
    setSelectedBadgeIndex(undefined);
  };
  const addItem = async () => {
    const { hasError } = runValidationTasks();
    if (
      currentFieldValue !== undefined &&
      currentFieldValue !== null &&
      currentFieldValue !== "" &&
      !hasError
    ) {
      const newItems = [...items];
      if (selectedBadgeIndex !== undefined) {
        newItems[selectedBadgeIndex] = currentFieldValue;
        setSelectedBadgeIndex(undefined);
      } else {
        newItems.push(currentFieldValue);
      }
      await onChange(newItems);
      setIsEditing(false);
    }
  };
  const arraySection = (
    <React.Fragment>
      {!!items?.length && (
        <ScrollView height="inherit" width="inherit" maxHeight={"7rem"}>
          {items.map((value, index) => {
            return (
              <Badge
                key={index}
                style={{
                  cursor: "pointer",
                  alignItems: "center",
                  marginRight: 3,
                  marginTop: 3,
                  backgroundColor:
                    index === selectedBadgeIndex ? "#B8CEF9" : "",
                }}
                onClick={() => {
                  setSelectedBadgeIndex(index);
                  setFieldValue(items[index]);
                  setIsEditing(true);
                }}
              >
                {getBadgeText ? getBadgeText(value) : value.toString()}
                <Icon
                  style={{
                    cursor: "pointer",
                    paddingLeft: 3,
                    width: 20,
                    height: 20,
                  }}
                  viewBox={{ width: 20, height: 20 }}
                  paths={[
                    {
                      d: "M10 10l5.09-5.09L10 10l5.09 5.09L10 10zm0 0L4.91 4.91 10 10l-5.09 5.09L10 10z",
                      stroke: "black",
                    },
                  ]}
                  ariaLabel="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeItem(index);
                  }}
                />
              </Badge>
            );
          })}
        </ScrollView>
      )}
      <Divider orientation="horizontal" marginTop={5} />
    </React.Fragment>
  );
  if (lengthLimit !== undefined && items.length >= lengthLimit && !isEditing) {
    return (
      <React.Fragment>
        {labelElement}
        {arraySection}
      </React.Fragment>
    );
  }
  return (
    <React.Fragment>
      {labelElement}
      {isEditing && children}
      {!isEditing ? (
        <>
          <Button
            onClick={() => {
              setIsEditing(true);
            }}
          >
            Add item
          </Button>
          {errorMessage && hasError && (
            <Text color={errorStyles.color} fontSize={errorStyles.fontSize}>
              {errorMessage}
            </Text>
          )}
        </>
      ) : (
        <Flex justifyContent="flex-end">
          {(currentFieldValue || isEditing) && (
            <Button
              children="Cancel"
              type="button"
              size="small"
              onClick={() => {
                setFieldValue(defaultFieldValue);
                setIsEditing(false);
                setSelectedBadgeIndex(undefined);
              }}
            ></Button>
          )}
          <Button size="small" variation="link" onClick={addItem}>
            {selectedBadgeIndex !== undefined ? "Save" : "Add"}
          </Button>
        </Flex>
      )}
      {arraySection}
    </React.Fragment>
  );
}
export default function QChatRequestUpdateForm(props) {
  const {
    id: idProp,
    qChatRequest: qChatRequestModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    customer: "",
    website: "",
    additional_sites: [],
    chatbotname: "",
    chatbot_logo_url: "",
    initial_text: "",
    guardrails: "",
    docs: [],
    token: "",
    bot_status: "",
    qchatform_status: "",
    expiry_datetime: "",
    requester_email: "",
  };
  const [customer, setCustomer] = React.useState(initialValues.customer);
  const [website, setWebsite] = React.useState(initialValues.website);
  const [additional_sites, setAdditional_sites] = React.useState(
    initialValues.additional_sites
  );
  const [chatbotname, setChatbotname] = React.useState(
    initialValues.chatbotname
  );
  const [chatbot_logo_url, setChatbot_logo_url] = React.useState(
    initialValues.chatbot_logo_url
  );
  const [initial_text, setInitial_text] = React.useState(
    initialValues.initial_text
  );
  const [guardrails, setGuardrails] = React.useState(initialValues.guardrails);
  const [docs, setDocs] = React.useState(initialValues.docs);
  const [token, setToken] = React.useState(initialValues.token);
  const [bot_status, setBot_status] = React.useState(initialValues.bot_status);
  const [qchatform_status, setQchatform_status] = React.useState(
    initialValues.qchatform_status
  );
  const [expiry_datetime, setExpiry_datetime] = React.useState(
    initialValues.expiry_datetime
  );
  const [requester_email, setRequester_email] = React.useState(
    initialValues.requester_email
  );
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = qChatRequestRecord
      ? { ...initialValues, ...qChatRequestRecord }
      : initialValues;
    setCustomer(cleanValues.customer);
    setWebsite(cleanValues.website);
    setAdditional_sites(cleanValues.additional_sites ?? []);
    setCurrentAdditional_sitesValue("");
    setChatbotname(cleanValues.chatbotname);
    setChatbot_logo_url(cleanValues.chatbot_logo_url);
    setInitial_text(cleanValues.initial_text);
    setGuardrails(cleanValues.guardrails);
    setDocs(cleanValues.docs ?? []);
    setCurrentDocsValue("");
    setToken(cleanValues.token);
    setBot_status(cleanValues.bot_status);
    setQchatform_status(cleanValues.qchatform_status);
    setExpiry_datetime(cleanValues.expiry_datetime);
    setRequester_email(cleanValues.requester_email);
    setErrors({});
  };
  const [qChatRequestRecord, setQChatRequestRecord] = React.useState(
    qChatRequestModelProp
  );
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? (
            await client.graphql({
              query: getQChatRequest.replaceAll("__typename", ""),
              variables: { id: idProp },
            })
          )?.data?.getQChatRequest
        : qChatRequestModelProp;
      setQChatRequestRecord(record);
    };
    queryData();
  }, [idProp, qChatRequestModelProp]);
  React.useEffect(resetStateValues, [qChatRequestRecord]);
  const [currentAdditional_sitesValue, setCurrentAdditional_sitesValue] =
    React.useState("");
  const additional_sitesRef = React.createRef();
  const [currentDocsValue, setCurrentDocsValue] = React.useState("");
  const docsRef = React.createRef();
  const validations = {
    customer: [{ type: "Required" }],
    website: [{ type: "Required" }],
    additional_sites: [],
    chatbotname: [],
    chatbot_logo_url: [],
    initial_text: [],
    guardrails: [],
    docs: [],
    token: [],
    bot_status: [],
    qchatform_status: [],
    expiry_datetime: [],
    requester_email: [{ type: "Email" }],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue;
    let validationResponse = validateField(value, validations[fieldName]);
    const customValidator = fetchByPath(onValidate, fieldName);
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse);
    }
    setErrors((errors) => ({ ...errors, [fieldName]: validationResponse }));
    return validationResponse;
  };
  const convertToLocal = (date) => {
    const df = new Intl.DateTimeFormat("default", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      calendar: "iso8601",
      numberingSystem: "latn",
      hourCycle: "h23",
    });
    const parts = df.formatToParts(date).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  };
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async (event) => {
        event.preventDefault();
        let modelFields = {
          customer,
          website,
          additional_sites: additional_sites ?? null,
          chatbotname: chatbotname ?? null,
          chatbot_logo_url: chatbot_logo_url ?? null,
          initial_text: initial_text ?? null,
          guardrails: guardrails ?? null,
          docs: docs ?? null,
          token: token ?? null,
          bot_status: bot_status ?? null,
          qchatform_status: qchatform_status ?? null,
          expiry_datetime: expiry_datetime ?? null,
          requester_email: requester_email ?? null,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item)
                )
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName])
            );
            return promises;
          }, [])
        );
        if (validationResponses.some((r) => r.hasError)) {
          return;
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields);
        }
        try {
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === "string" && value === "") {
              modelFields[key] = null;
            }
          });
          await client.graphql({
            query: updateQChatRequest.replaceAll("__typename", ""),
            variables: {
              input: {
                id: qChatRequestRecord.id,
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "QChatRequestUpdateForm")}
      {...rest}
    >
      <TextField
        label="Customer"
        isRequired={true}
        isReadOnly={false}
        value={customer}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              customer: value,
              website,
              additional_sites,
              chatbotname,
              chatbot_logo_url,
              initial_text,
              guardrails,
              docs,
              token,
              bot_status,
              qchatform_status,
              expiry_datetime,
              requester_email,
            };
            const result = onChange(modelFields);
            value = result?.customer ?? value;
          }
          if (errors.customer?.hasError) {
            runValidationTasks("customer", value);
          }
          setCustomer(value);
        }}
        onBlur={() => runValidationTasks("customer", customer)}
        errorMessage={errors.customer?.errorMessage}
        hasError={errors.customer?.hasError}
        {...getOverrideProps(overrides, "customer")}
      ></TextField>
      <TextField
        label="Website"
        isRequired={true}
        isReadOnly={false}
        value={website}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              customer,
              website: value,
              additional_sites,
              chatbotname,
              chatbot_logo_url,
              initial_text,
              guardrails,
              docs,
              token,
              bot_status,
              qchatform_status,
              expiry_datetime,
              requester_email,
            };
            const result = onChange(modelFields);
            value = result?.website ?? value;
          }
          if (errors.website?.hasError) {
            runValidationTasks("website", value);
          }
          setWebsite(value);
        }}
        onBlur={() => runValidationTasks("website", website)}
        errorMessage={errors.website?.errorMessage}
        hasError={errors.website?.hasError}
        {...getOverrideProps(overrides, "website")}
      ></TextField>
      <ArrayField
        onChange={async (items) => {
          let values = items;
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites: values,
              chatbotname,
              chatbot_logo_url,
              initial_text,
              guardrails,
              docs,
              token,
              bot_status,
              qchatform_status,
              expiry_datetime,
              requester_email,
            };
            const result = onChange(modelFields);
            values = result?.additional_sites ?? values;
          }
          setAdditional_sites(values);
          setCurrentAdditional_sitesValue("");
        }}
        currentFieldValue={currentAdditional_sitesValue}
        label={"Additional sites"}
        items={additional_sites}
        hasError={errors?.additional_sites?.hasError}
        runValidationTasks={async () =>
          await runValidationTasks(
            "additional_sites",
            currentAdditional_sitesValue
          )
        }
        errorMessage={errors?.additional_sites?.errorMessage}
        setFieldValue={setCurrentAdditional_sitesValue}
        inputFieldRef={additional_sitesRef}
        defaultFieldValue={""}
      >
        <TextField
          label="Additional sites"
          isRequired={false}
          isReadOnly={false}
          value={currentAdditional_sitesValue}
          onChange={(e) => {
            let { value } = e.target;
            if (errors.additional_sites?.hasError) {
              runValidationTasks("additional_sites", value);
            }
            setCurrentAdditional_sitesValue(value);
          }}
          onBlur={() =>
            runValidationTasks("additional_sites", currentAdditional_sitesValue)
          }
          errorMessage={errors.additional_sites?.errorMessage}
          hasError={errors.additional_sites?.hasError}
          ref={additional_sitesRef}
          labelHidden={true}
          {...getOverrideProps(overrides, "additional_sites")}
        ></TextField>
      </ArrayField>
      <TextField
        label="Chatbotname"
        isRequired={false}
        isReadOnly={false}
        value={chatbotname}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites,
              chatbotname: value,
              chatbot_logo_url,
              initial_text,
              guardrails,
              docs,
              token,
              bot_status,
              qchatform_status,
              expiry_datetime,
              requester_email,
            };
            const result = onChange(modelFields);
            value = result?.chatbotname ?? value;
          }
          if (errors.chatbotname?.hasError) {
            runValidationTasks("chatbotname", value);
          }
          setChatbotname(value);
        }}
        onBlur={() => runValidationTasks("chatbotname", chatbotname)}
        errorMessage={errors.chatbotname?.errorMessage}
        hasError={errors.chatbotname?.hasError}
        {...getOverrideProps(overrides, "chatbotname")}
      ></TextField>
      <TextField
        label="Chatbot logo url"
        isRequired={false}
        isReadOnly={false}
        value={chatbot_logo_url}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites,
              chatbotname,
              chatbot_logo_url: value,
              initial_text,
              guardrails,
              docs,
              token,
              bot_status,
              qchatform_status,
              expiry_datetime,
              requester_email,
            };
            const result = onChange(modelFields);
            value = result?.chatbot_logo_url ?? value;
          }
          if (errors.chatbot_logo_url?.hasError) {
            runValidationTasks("chatbot_logo_url", value);
          }
          setChatbot_logo_url(value);
        }}
        onBlur={() => runValidationTasks("chatbot_logo_url", chatbot_logo_url)}
        errorMessage={errors.chatbot_logo_url?.errorMessage}
        hasError={errors.chatbot_logo_url?.hasError}
        {...getOverrideProps(overrides, "chatbot_logo_url")}
      ></TextField>
      <TextField
        label="Initial text"
        isRequired={false}
        isReadOnly={false}
        value={initial_text}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites,
              chatbotname,
              chatbot_logo_url,
              initial_text: value,
              guardrails,
              docs,
              token,
              bot_status,
              qchatform_status,
              expiry_datetime,
              requester_email,
            };
            const result = onChange(modelFields);
            value = result?.initial_text ?? value;
          }
          if (errors.initial_text?.hasError) {
            runValidationTasks("initial_text", value);
          }
          setInitial_text(value);
        }}
        onBlur={() => runValidationTasks("initial_text", initial_text)}
        errorMessage={errors.initial_text?.errorMessage}
        hasError={errors.initial_text?.hasError}
        {...getOverrideProps(overrides, "initial_text")}
      ></TextField>
      <TextField
        label="Guardrails"
        isRequired={false}
        isReadOnly={false}
        value={guardrails}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites,
              chatbotname,
              chatbot_logo_url,
              initial_text,
              guardrails: value,
              docs,
              token,
              bot_status,
              qchatform_status,
              expiry_datetime,
              requester_email,
            };
            const result = onChange(modelFields);
            value = result?.guardrails ?? value;
          }
          if (errors.guardrails?.hasError) {
            runValidationTasks("guardrails", value);
          }
          setGuardrails(value);
        }}
        onBlur={() => runValidationTasks("guardrails", guardrails)}
        errorMessage={errors.guardrails?.errorMessage}
        hasError={errors.guardrails?.hasError}
        {...getOverrideProps(overrides, "guardrails")}
      ></TextField>
      <ArrayField
        onChange={async (items) => {
          let values = items;
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites,
              chatbotname,
              chatbot_logo_url,
              initial_text,
              guardrails,
              docs: values,
              token,
              bot_status,
              qchatform_status,
              expiry_datetime,
              requester_email,
            };
            const result = onChange(modelFields);
            values = result?.docs ?? values;
          }
          setDocs(values);
          setCurrentDocsValue("");
        }}
        currentFieldValue={currentDocsValue}
        label={"Docs"}
        items={docs}
        hasError={errors?.docs?.hasError}
        runValidationTasks={async () =>
          await runValidationTasks("docs", currentDocsValue)
        }
        errorMessage={errors?.docs?.errorMessage}
        setFieldValue={setCurrentDocsValue}
        inputFieldRef={docsRef}
        defaultFieldValue={""}
      >
        <TextField
          label="Docs"
          isRequired={false}
          isReadOnly={false}
          value={currentDocsValue}
          onChange={(e) => {
            let { value } = e.target;
            if (errors.docs?.hasError) {
              runValidationTasks("docs", value);
            }
            setCurrentDocsValue(value);
          }}
          onBlur={() => runValidationTasks("docs", currentDocsValue)}
          errorMessage={errors.docs?.errorMessage}
          hasError={errors.docs?.hasError}
          ref={docsRef}
          labelHidden={true}
          {...getOverrideProps(overrides, "docs")}
        ></TextField>
      </ArrayField>
      <TextField
        label="Token"
        isRequired={false}
        isReadOnly={false}
        value={token}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites,
              chatbotname,
              chatbot_logo_url,
              initial_text,
              guardrails,
              docs,
              token: value,
              bot_status,
              qchatform_status,
              expiry_datetime,
              requester_email,
            };
            const result = onChange(modelFields);
            value = result?.token ?? value;
          }
          if (errors.token?.hasError) {
            runValidationTasks("token", value);
          }
          setToken(value);
        }}
        onBlur={() => runValidationTasks("token", token)}
        errorMessage={errors.token?.errorMessage}
        hasError={errors.token?.hasError}
        {...getOverrideProps(overrides, "token")}
      ></TextField>
      <SelectField
        label="Bot status"
        placeholder="Please select an option"
        isDisabled={false}
        value={bot_status}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites,
              chatbotname,
              chatbot_logo_url,
              initial_text,
              guardrails,
              docs,
              token,
              bot_status: value,
              qchatform_status,
              expiry_datetime,
              requester_email,
            };
            const result = onChange(modelFields);
            value = result?.bot_status ?? value;
          }
          if (errors.bot_status?.hasError) {
            runValidationTasks("bot_status", value);
          }
          setBot_status(value);
        }}
        onBlur={() => runValidationTasks("bot_status", bot_status)}
        errorMessage={errors.bot_status?.errorMessage}
        hasError={errors.bot_status?.hasError}
        {...getOverrideProps(overrides, "bot_status")}
      >
        <option
          children="Active"
          value="Active"
          {...getOverrideProps(overrides, "bot_statusoption0")}
        ></option>
        <option
          children="Expired"
          value="Expired"
          {...getOverrideProps(overrides, "bot_statusoption1")}
        ></option>
        <option
          children="Disabled"
          value="Disabled"
          {...getOverrideProps(overrides, "bot_statusoption2")}
        ></option>
      </SelectField>
      <SelectField
        label="Qchatform status"
        placeholder="Please select an option"
        isDisabled={false}
        value={qchatform_status}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites,
              chatbotname,
              chatbot_logo_url,
              initial_text,
              guardrails,
              docs,
              token,
              bot_status,
              qchatform_status: value,
              expiry_datetime,
              requester_email,
            };
            const result = onChange(modelFields);
            value = result?.qchatform_status ?? value;
          }
          if (errors.qchatform_status?.hasError) {
            runValidationTasks("qchatform_status", value);
          }
          setQchatform_status(value);
        }}
        onBlur={() => runValidationTasks("qchatform_status", qchatform_status)}
        errorMessage={errors.qchatform_status?.errorMessage}
        hasError={errors.qchatform_status?.hasError}
        {...getOverrideProps(overrides, "qchatform_status")}
      >
        <option
          children="Submitted"
          value="Submitted"
          {...getOverrideProps(overrides, "qchatform_statusoption0")}
        ></option>
        <option
          children="Completed"
          value="Completed"
          {...getOverrideProps(overrides, "qchatform_statusoption1")}
        ></option>
        <option
          children="Error"
          value="Error"
          {...getOverrideProps(overrides, "qchatform_statusoption2")}
        ></option>
      </SelectField>
      <TextField
        label="Expiry datetime"
        isRequired={false}
        isReadOnly={false}
        type="datetime-local"
        value={expiry_datetime && convertToLocal(new Date(expiry_datetime))}
        onChange={(e) => {
          let value =
            e.target.value === "" ? "" : new Date(e.target.value).toISOString();
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites,
              chatbotname,
              chatbot_logo_url,
              initial_text,
              guardrails,
              docs,
              token,
              bot_status,
              qchatform_status,
              expiry_datetime: value,
              requester_email,
            };
            const result = onChange(modelFields);
            value = result?.expiry_datetime ?? value;
          }
          if (errors.expiry_datetime?.hasError) {
            runValidationTasks("expiry_datetime", value);
          }
          setExpiry_datetime(value);
        }}
        onBlur={() => runValidationTasks("expiry_datetime", expiry_datetime)}
        errorMessage={errors.expiry_datetime?.errorMessage}
        hasError={errors.expiry_datetime?.hasError}
        {...getOverrideProps(overrides, "expiry_datetime")}
      ></TextField>
      <TextField
        label="Requester email"
        isRequired={false}
        isReadOnly={false}
        value={requester_email}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites,
              chatbotname,
              chatbot_logo_url,
              initial_text,
              guardrails,
              docs,
              token,
              bot_status,
              qchatform_status,
              expiry_datetime,
              requester_email: value,
            };
            const result = onChange(modelFields);
            value = result?.requester_email ?? value;
          }
          if (errors.requester_email?.hasError) {
            runValidationTasks("requester_email", value);
          }
          setRequester_email(value);
        }}
        onBlur={() => runValidationTasks("requester_email", requester_email)}
        errorMessage={errors.requester_email?.errorMessage}
        hasError={errors.requester_email?.hasError}
        {...getOverrideProps(overrides, "requester_email")}
      ></TextField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Reset"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          isDisabled={!(idProp || qChatRequestModelProp)}
          {...getOverrideProps(overrides, "ResetButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={
              !(idProp || qChatRequestModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
