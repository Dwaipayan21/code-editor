import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import "./App.css";
import { Editor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { MonacoBinding } from "y-monaco";
import { useMemo, useEffect, useState } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

// Bundle Monaco locally (fixes the CDN worker load failure)
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};
loader.config({ monaco });

const SOCKET_URL = "http://localhost:3000";

const App = () => {
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || "";
  });
  const [users, setUsers] = useState([]);
  const [editor, setEditor] = useState(null);
  const [provider, setProvider] = useState(null);

  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  const handleMount = (ed) => setEditor(ed);

  const handleJoin = (e) => {
    e.preventDefault();
    const name = e.target.username.value.trim();
    if (!name) return;
    setUsername(name);
    window.history.pushState({}, "", "?username=" + encodeURIComponent(name));
  };

  // Provider + awareness
  useEffect(() => {
    if (!username) return;

    const p = new SocketIOProvider(SOCKET_URL, "monaco", ydoc, {
      autoConnect: true,
    });
    setProvider(p);

    p.awareness.setLocalStateField("user", { username });

    const updateUsers = () => {
      const states = Array.from(p.awareness.getStates().values());
      setUsers(states.filter((s) => s.user?.username).map((s) => s.user));
    };

    updateUsers();
    p.awareness.on("change", updateUsers);

    const handleBeforeUnload = () =>
      p.awareness.setLocalStateField("user", null);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      p.awareness.off("change", updateUsers);
      p.disconnect();
      setProvider(null);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [username, ydoc]);

  // Editor <-> Yjs binding
  useEffect(() => {
    if (!editor || !provider) return;

    const binding = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );

    return () => binding.destroy();
  }, [editor, provider, yText]);

  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-900 p-2 flex items-center justify-center">
        <form onSubmit={handleJoin} className="flex flex-col gap-4 w-72">
          <input
            type="text"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-800 text-white"
            name="username"
          />
          <button
            type="submit"
            className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold"
          >
            Join
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="h-screen w-full bg-gray-900 p-2">
      <ResizablePanelGroup orientation="horizontal">
        {/* sidebar */}
        <ResizablePanel
          defaultSize="27%"
          minSize="20%"
          maxSize="30%"
          className="h-full rounded-lg bg-amber-50 p-2"
        >
          <h2 className="text-2xl font-bold p-4 border-b border-gray-300">
            Users
          </h2>
          <ul className="p-4">
            {users.map((user) => (
              <li
                key={user.username}
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