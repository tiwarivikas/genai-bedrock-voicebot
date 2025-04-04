import { PowerIcon } from "@heroicons/react/24/outline";
import { useUser } from "../projects/UserContext";

export default function TopNav() {
    const { emailId, projectName, dispatch } = useUser();
    return (
        <div className="flex h-20 shrink-0 items-end rounded-lg bg-blue-800 p-4 text-gray-200">
            <div className="flex grow text-4xl">{projectName}</div>
            <div className="flex items-end gap-2">
                <div className="hidden md:block mb-2">{emailId}</div>
                <form>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            dispatch({ type: "LOGOUT" })
                        }}
                        className="flex h-[48px] grow rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600">
                        <PowerIcon className="w-6 text-gray-900" />
                    </button>
                </form>
            </div>
        </div>
    );
}
