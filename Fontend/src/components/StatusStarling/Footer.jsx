export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="py-6 text-center">
      <p className="text-gray-500 text-sm">&copy; {year} Sterling Septic & Plumbing LLC</p>
    </footer>
  );
}
