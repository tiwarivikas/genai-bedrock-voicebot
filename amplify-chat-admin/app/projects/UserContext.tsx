//Write React function to create a Context for User Authentication
import { createContext, useContext, useEffect, useReducer } from "react";
import { fetchUserAttributes, getCurrentUser, signOut } from "aws-amplify/auth";

const initialState = {
    isLoggedIn: false,
    isAdmin: false,
    user: null,
    emailId: null,
    projectName: ""
}

const UserContext = createContext<any>(null)


function reducer(state, action) {
    switch (action.type) {
        case 'LOGIN':
            return {
                ...state,
                isLoggedIn: true,
                user: action.payload.user,
                emailId: action.payload.emailId,
                isAdmin: action.payload.emailId == "tiwvika@amazon.com"
            }
        case 'LOGOUT':
            handleSignOut();
            return {
                ...state,
                isLoggedIn: false,
                user: null,
                emailId: null
            }
        case "SETPROJECT":
            return {
                ...state,
                projectName: action.payload.projectName
            }

        default:
            return state
    }
}



async function handleSignOut() {
    try {
        const result = await signOut();
        console.log("Signed Out Result: " + result)
    } catch (error) {
        console.log("error signing out: ", error);
    }
}

async function currentAuthenticatedUser(dispatch) {
    try {
        const { username, userId, signInDetails } = await getCurrentUser();
        var email = ""
        if (!signInDetails?.loginId) {
            const resp = await fetchUserAttributes();
            email = resp.email || ""
        } else {
            email = signInDetails?.loginId
        }
        dispatch({ type: "LOGIN", payload: { user: username, emailId: email } })
    } catch (err) {
        console.log(err);
    }
}

function UserProvider({ children }) {
    const [{ isLoggedIn, isAdmin, user, emailId, projectName }, dispatch] = useReducer(reducer, initialState)

    useEffect(() => {
        currentAuthenticatedUser(dispatch);
    }, []);

    return (
        <UserContext.Provider value={{
            isLoggedIn,
            isAdmin,
            user,
            emailId,
            projectName,

            dispatch,
        }} >
            {children}
        </ UserContext.Provider>
    )
}

function useUser() {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider')
    }
    return context;
}

export { UserProvider, useUser }