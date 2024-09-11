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
  SwitchField,
  SelectField,
  Text,
  TextField,
  useTheme,
} from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { generateClient } from "aws-amplify/api";
import { createQChatRequest } from "./graphql/mutations";
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
export default function QChatRequestCreateForm(props) {
  const {
    clearOnSuccess = true,
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
    acceptTnC: false,
    regionQ: "",
  };
  const [customer, setCustomer] = React.useState(initialValues.customer);
  const [website, setWebsite] = React.useState(initialValues.website);
  const [additional_sites, setAdditional_sites] = React.useState(
    initialValues.additional_sites,
  );
  const [chatbotname, setChatbotname] = React.useState(
    initialValues.chatbotname,
  );
  const [chatbot_logo_url, setChatbot_logo_url] = React.useState(
    initialValues.chatbot_logo_url,
  );
  const [initial_text, setInitial_text] = React.useState(
    initialValues.initial_text,
  );
  const [guardrails, setGuardrails] = React.useState(initialValues.guardrails);
  const [acceptTnC, setAcceptTnC] = React.useState(initialValues.acceptTnC);
  const [regionQ, setRegionQ] = React.useState(initialValues.regionQ);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    setCustomer(initialValues.customer);
    setWebsite(initialValues.website);
    setAdditional_sites(initialValues.additional_sites);
    setCurrentAdditional_sitesValue("");
    setChatbotname(initialValues.chatbotname);
    setChatbot_logo_url(initialValues.chatbot_logo_url);
    setInitial_text(initialValues.initial_text);
    setGuardrails(initialValues.guardrails);
    setAcceptTnC(initialValues.acceptTnC);
    setRegionQ(initialValues.regionQ);
    setErrors({});
  };
  const [currentAdditional_sitesValue, setCurrentAdditional_sitesValue] =
    React.useState("");
  const additional_sitesRef = React.createRef();
  const [currentDocsValue, setCurrentDocsValue] = React.useState("");
  const docsRef = React.createRef();
  const validations = {
    customer: [{ type: "Required" }],
    website: [{ type: "Required" }/* , { type: "URL" } */],
    additional_sites: [{ type: "URL" }],
    chatbotname: [],
    chatbot_logo_url: [],
    initial_text: [],
    guardrails: [],
    acceptTnC: [{ type: "Required" }],
    regionQ: [],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue,
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
          additional_sites,
          chatbotname,
          chatbot_logo_url,
          initial_text,
          guardrails,
          acceptTnC,
          regionQ,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item),
                ),
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName]),
            );
            return promises;
          }, []),
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
          const result = await client.graphql({
            query: createQChatRequest.replaceAll("__typename", ""),
            variables: {
              input: {
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            //onSuccess(modelFields);
            onSuccess(result.data.createQChatRequest);
          }
          if (clearOnSuccess) {
            resetStateValues();
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "QChatRequestCreateForm")}
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
              acceptTnC,
              regionQ,
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
      <Grid
        columnGap="inherit"
        rowGap="inherit"
        templateColumns="repeat(2, auto)"
        {...getOverrideProps(overrides, "RowGrid2")}
      >
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
                acceptTnC,
                regionQ,
              };
              const result = onChange(modelFields);
              value = result?.website ?? value;
            }
            if (errors.website?.hasError) {
              runValidationTasks("website", value);
            }
            setWebsite(value.toLowerCase());
          }}
          onBlur={() => runValidationTasks("website", website)}
          errorMessage={errors.website?.errorMessage}
          hasError={errors.website?.hasError}
          {...getOverrideProps(overrides, "website")}
        ></TextField>
      </Grid>
      <Grid
        columnGap="inherit"
        rowGap="inherit"
        templateColumns="repeat(2, auto)"
        {...getOverrideProps(overrides, "RowGrid2")}
      >
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
                acceptTnC,
                regionQ,
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
      </Grid>
      <SwitchField
        label="Please confirm that you have taken consent from customer to crawl their website."
        defaultChecked={false}
        isDisabled={false}
        isChecked={acceptTnC}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              customer,
              website,
              additional_sites,
              chatbotname,
              chatbot_logo_url,
              initial_text,
              guardrails,
              acceptTnC: value,
              regionQ,
            };
            const result = onChange(modelFields);
            value = result?.acceptTnC ?? value;
          }
          if (errors.acceptTnC?.hasError) {
            runValidationTasks("acceptTnC", value);
          }
          setAcceptTnC(value);
        }}
        onBlur={() => runValidationTasks("acceptTnC", acceptTnC)}
        errorMessage={errors.acceptTnC?.errorMessage}
        hasError={errors.acceptTnC?.hasError}
        {...getOverrideProps(overrides, "acceptTnC")}
      ></SwitchField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Clear"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          {...getOverrideProps(overrides, "ClearButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={Object.values(errors).some((e) => e?.hasError)}
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
