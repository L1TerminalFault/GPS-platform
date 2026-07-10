import { FiBox } from "react-icons/fi";

export default function EmptyState({ title = "No data", message = "No data found.", action }: any) {
  return (
    <div className="w-full border border-dashed border-theme-border/50 rounded-3xl p-10 flex flex-col items-center justify-center text-center mt-10 bg-theme-card/30">
        <div className="p-4 bg-theme-background rounded-full border border-theme-border/50 shadow-inner mb-4">
            <FiBox className="text-3xl text-theme-text/30" />
        </div>
        <h3 className="text-xl font-bold tracking-tight mb-2">{title}</h3>
        <p className="text-theme-text/50 text-sm max-w-sm mb-6">{message}</p>
        {action}
    </div>
  );
}
