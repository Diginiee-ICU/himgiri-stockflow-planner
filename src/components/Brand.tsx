import warehouseIcon from "@/assets/himgiri-warehouse-icon.jpg";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img src={warehouseIcon} alt="HIMGIRI logo" width={40} height={40} className="size-10 shrink-0 rounded-md object-contain" />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="font-display text-xl font-black tracking-wide">HIMGIRI</div>
          <div className="text-xs uppercase tracking-wide opacity-70">Warehouse</div>
        </div>
      )}
    </div>
  );
}
