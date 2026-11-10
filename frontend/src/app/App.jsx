import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import "./App.css";
import { Editor } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useRef, useMemo, useEffect, useState } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

const App = () => {
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || "";
  });
  const editorRef = useRef(null);
  const [users, setUsers] = useState([]);

  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  const handleMount = (editor) => {
    editorRef.current = editor;

    const monacoBinding = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
      )
  }

  const handleJoin = () => {
    e.preventDefault();
    setUsername(e.target.username.value);
    window.history.pushState({},"","?username=" + e.target.username.value)
  }

  useEffect(() => {
    console.log(username);

    if(username ){
      const provider = new SocketIOProvider("http://localhost:3000", "monaco", ydoc, {
        autoConnect: true,
      });
      
      provider.awareness.setLocalStateField("user", { username })

      const updateUsers = () => {
        const states = Array.from(provider.awareness.getStates().values());

        console.log("All awareness states:", states);

        setUsers(states.filter((state) => state.user && state.user.username).map((state) => state.user));
      }

      //Get initial users
      updateUsers();

      //Update when users join or leave
      provider.awareness.on("change", updateUsers);

      function handleBeforeUnload () {
        provider.awareness.setLocalStateField("user", null)
      }

      window.addEventListener("beforeunload", handleBeforeUnload)

      return () => {
        provider.awareness.off("change", updateUsers);
        provider.disconnect();
        window.removeEventListener("beforeunload", handleBeforeUnload)
      }
    }
  },[username, ydoc])

  if(!username){
    return (
      <main className="h-screen w-full bg-gray-900 p-2 items-center justify-center">
        <form 
          onSubmit={handleJoin}
          className="flex flex-col gap-4">
          <input 
            type="text"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-800 text-white"
            name = "username"
          />

          <button
            className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold"
          >
            Join
          </button>
        </form>

      </main>
    )
  }
  return (
    <main className="h-screen w-full bg-gray-900 p-2">
      {/* sidebar */}
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel
          defaultSize="27%"
          minSize="20%"
          maxSize="30%"
          className="h-full rounded-lg bg-amber-50 p-2"
        >
          <h2
            className="text-2xl font-bold p-4 border-b border-gray-300"
          >
            Users
          </h2>
          <ul className="p-4">
            {users.map((user, index) => (
              <li 
                key={index}
                className="p-2 text-gray-800 font-bold mb-2"
              >
                {user.username}
              </li>
            ))}
          </ul>
        </ResizablePanel>

        <ResizableHandle className="w-2 bg-gray-900" />

        {/* code editor */}
        <ResizablePanel className="h-full rounded-lg bg-neutral-800">
          <Editor
            height="90vh"
            defaultLanguage="javascript"
            defaultValue="// some comment"
            theme="vs-dark"
            onMount={handleMount}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
};

export default App;
