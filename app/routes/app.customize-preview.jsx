import AppRules, {
  action,
  loader,
  shouldRevalidate,
} from "./app.rules.jsx";

export { action, loader, shouldRevalidate };

export default function CustomizePreview() {
  return <AppRules initialTab="style" />;
}
