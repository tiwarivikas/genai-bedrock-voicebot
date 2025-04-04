import Link from "next/link";

function Header() {
  return (
    <header className="flex items-center justify-between border-b text-stone-200 border-stone-200 bg-stone-600 px-4 py-3 uppercase sm:px-6">
      <Link href="/">Home</Link>
      <Link href="/projects/todos">ToDo App</Link>
      <p className="text-stone-200">Vikas</p>
    </header>
  );
}

export default Header;
