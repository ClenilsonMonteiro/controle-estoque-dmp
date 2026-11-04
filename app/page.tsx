"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ErrorRecord = {
  id: string;
  date: string;
  street: string;
  building: string;
  level: string;
  apartment: string;
  code: string;
  physical: number;
  system: number;
  type: string;
  productCodes: string;
  adjustment: string;
  shift: string;
  responsible: string;
  status: string;
  notes: string;
};

type ErrorForm = {
  date: string;
  street: string;
  building: string;
  level: string;
  apartment: string;
  code: string;
  physical: string;
  system: string;
  type: string;
  productCodes: string;
  adjustment: string;
  shift: string;
  responsible: string;
  status: string;
  notes: string;
};

type InventoryRecord = {
  id: string;
  date: string;
  counted: number;
  accurate: number;
  movements: number;
  adjustments: number;
  planned: number;
  executed: number;
  notes: string;
};

type InventoryForm = {
  date: string;
  counted: string;
  accurate: string;
  movements: string;
  adjustments: string;
  planned: string;
  executed: string;
  notes: string;
};

type Page =
  | "errors"
  | "errorDashboard"
  | "inventory"
  | "inventoryDashboard"
  | "base";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100";
const buttonClass =
  "rounded-lg bg-cyan-800 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-900";
const secondaryButtonClass =
  "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";

const errorTypes = [
  "Sistema",
  "Endereçamento",
  "Pessoa/Processo",
  "Movimentação",
  "Múltiplos produtos",
  "Outros",
];

const emptyErrorForm: ErrorForm = {
  date: "",
  street: "",
  building: "",
  level: "",
  apartment: "",
  code: "",
  physical: "",
  system: "",
  type: "",
  productCodes: "",
  adjustment: "Não",
  shift: "",
  responsible: "",
  status: "Avaliando",
  notes: "",
};

const emptyInventoryForm: InventoryForm = {
  date: "",
  counted: "",
  accurate: "",
  movements: "",
  adjustments: "",
  planned: "",
  executed: "",
  notes: "",
};

function localToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function percentage(numerator: number, denominator: number) {
  return denominator ? (numerator / denominator) * 100 : 0;
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatDate(value: string) {
  if (!value) return "";

  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function statusClass(status: string) {
  switch (status) {
    case "Avaliando":
      return "inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800";
    case "Em Andamento":
      return "inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800";
    case "Concluído":
      return "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800";
    default:
      return "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700";
  }
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-cyan-900">{value}</p>
    </article>
  );
}

function MetricChart({
  title,
  data,
  color = "bg-cyan-700",
  formatValue = formatNumber,
  chartType = "column",
}: {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
  formatValue?: (value: number) => string;
  chartType?: "line" | "column";
}) {
  const width = 720;
  const height = 310;
  const left = 72;
  const right = 22;
  const top = 42;
  const bottom = 54;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(...data.map((item) => item.value), 0) || 1;
  const colorClass = color.replace("bg-", "text-");
  const dateLabelStep = Math.max(1, Math.ceil(data.length / 8));

  const pointX = (index: number) =>
    data.length === 1
      ? left + plotWidth / 2
      : left + (index / (data.length - 1)) * plotWidth;

  const pointY = (value: number) =>
    top + plotHeight - (value / maxValue) * plotHeight;

  const linePath = data
    .map((item, index) =>
      `${index === 0 ? "M" : "L"} ${pointX(index)} ${pointY(item.value)}`
    )
    .join(" ");

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-bold text-slate-800">{title}</h3>

      {data.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">
          Sem dados para os filtros selecionados.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            className={`h-72 min-w-[560px] w-full ${colorClass}`}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={title}
          >
            {[0, 1, 2, 3, 4].map((step) => {
              const y = top + plotHeight - (step / 4) * plotHeight;
              const value = (maxValue * step) / 4;

              return (
                <g key={step}>
                  <line
                    x1={left}
                    x2={width - right}
                    y1={y}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray={step === 0 ? undefined : "4 4"}
                  />
                  <text
                    x={left - 9}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#64748b"
                  >
                    {formatValue(value)}
                  </text>
                </g>
              );
            })}

            {chartType === "line" ? (
              <>
                {data.length > 1 && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}

                {data.map((item, index) => {
                  const x = pointX(index);
                  const y = pointY(item.value);

                  return (
                    <g key={`${item.label}-${index}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill="currentColor"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={Math.max(15, y - 11)}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill="#0f172a"
                        stroke="white"
                        strokeWidth="3"
                        paintOrder="stroke"
                      >
                        {formatValue(item.value)}
                      </text>
                      <title>{`${formatDate(item.label)}: ${formatValue(item.value)}`}</title>
                    </g>
                  );
                })}
              </>
            ) : (
              data.map((item, index) => {
                const slotWidth = plotWidth / data.length;
                const barWidth = Math.min(44, slotWidth * 0.58);
                const barHeight = (item.value / maxValue) * plotHeight;
                const x =
                  left + index * slotWidth + (slotWidth - barWidth) / 2;
                const y = top + plotHeight - barHeight;

                return (
                  <g key={`${item.label}-${index}`}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 1)}
                      rx="3"
                      fill="currentColor"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={Math.max(15, y - 7)}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill="#0f172a"
                      stroke="white"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      {formatValue(item.value)}
                    </text>
                    <title>{`${item.label}: ${formatValue(item.value)}`}</title>
                  </g>
                );
              })
            )}

            {data.map((item, index) =>
              index % dateLabelStep === 0 || index === data.length - 1 ? (
                <text
                  key={`${item.label}-axis-${index}`}
                  x={
                    chartType === "column"
                      ? left + (index + 0.5) * (plotWidth / data.length)
                      : pointX(index)
                  }
                  y={height - 15}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748b"
                >
                  {formatDate(item.label)}
                </text>
              ) : null
            )}
          </svg>
        </div>
      )}
    </article>
  );
}

function mapError(row: Record<string, unknown>): ErrorRecord {
  return {
    id: String(row.id),
    date: String(row.date ?? ""),
    street: String(row.street ?? ""),
    building: String(row.building ?? ""),
    level: String(row.level ?? ""),
    apartment: String(row.apartment ?? ""),
    code: String(row.code ?? ""),
    physical: Number(row.physical ?? 0),
    system: Number(row.system ?? 0),
    type: String(row.type ?? ""),
    productCodes: String(row.product_codes ?? ""),
    adjustment: String(row.adjustment ?? ""),
    shift: String(row.shift ?? ""),
    responsible: String(row.responsible ?? ""),
    status: String(row.status ?? ""),
    notes: String(row.notes ?? ""),
  };
}

function mapInventory(row: Record<string, unknown>): InventoryRecord {
  return {
    id: String(row.id),
    date: String(row.date ?? ""),
    counted: Number(row.counted ?? 0),
    accurate: Number(row.accurate ?? 0),
    movements: Number(row.movements ?? 0),
    adjustments: Number(row.adjustments ?? 0),
    planned: Number(row.planned ?? 0),
    executed: Number(row.executed ?? 0),
    notes: String(row.notes ?? ""),
  };
}

function toErrorForm(item: ErrorRecord): ErrorForm {
  return {
    date: item.date,
    street: item.street,
    building: item.building,
    level: item.level,
    apartment: item.apartment,
    code: item.code,
    physical: String(item.physical),
    system: String(item.system),
    type: item.type,
    productCodes: item.productCodes,
    adjustment: item.adjustment,
    shift: item.shift,
    responsible: item.responsible,
    status: item.status,
    notes: item.notes,
  };
}

function ErrorFields({
  value,
  onChange,
}: {
  value: ErrorForm;
  onChange: (next: ErrorForm) => void;
}) {
  function update<K extends keyof ErrorForm>(key: K, nextValue: ErrorForm[K]) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Data">
        <input
          className={inputClass}
          type="date"
          required
          value={value.date}
          onChange={(event) => update("date", event.target.value)}
        />
      </Field>
      <Field label="Rua">
        <input
          className={inputClass}
          required
          value={value.street}
          onChange={(event) => update("street", event.target.value)}
        />
      </Field>
      <Field label="Prédio">
        <input
          className={inputClass}
          required
          value={value.building}
          onChange={(event) => update("building", event.target.value)}
        />
      </Field>
      <Field label="Nível">
        <input
          className={inputClass}
          required
          value={value.level}
          onChange={(event) => update("level", event.target.value)}
        />
      </Field>
      <Field label="Apartamento">
        <input
          className={inputClass}
          required
          value={value.apartment}
          onChange={(event) => update("apartment", event.target.value)}
        />
      </Field>
      <Field label="Código do produto">
        <input
          className={inputClass}
          required
          value={value.code}
          onChange={(event) => update("code", event.target.value)}
        />
      </Field>
      <Field label="Quantidade física">
        <input
          className={inputClass}
          type="number"
          min="0"
          step="any"
          required
          value={value.physical}
          onChange={(event) => update("physical", event.target.value)}
        />
      </Field>
      <Field label="Quantidade no sistema">
        <input
          className={inputClass}
          type="number"
          min="0"
          step="any"
          required
          value={value.system}
          onChange={(event) => update("system", event.target.value)}
        />
      </Field>
      <Field label="Tipo de erro">
        <select
          className={inputClass}
          required
          value={value.type}
          onChange={(event) => update("type", event.target.value)}
        >
          <option value="">Selecione</option>
          {errorTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </Field>

      {value.type === "Múltiplos produtos" && (
        <Field label="Códigos dos produtos no endereço">
          <input
            className={inputClass}
            required
            placeholder="Separe os códigos por vírgula"
            value={value.productCodes}
            onChange={(event) => update("productCodes", event.target.value)}
          />
        </Field>
      )}

      <Field label="Ajuste no sistema?">
        <select
          className={inputClass}
          value={value.adjustment}
          onChange={(event) => update("adjustment", event.target.value)}
        >
          <option>Não</option>
          <option>Sim</option>
          <option>Pendente</option>
        </select>
      </Field>
      <Field label="Turno">
        <select
          className={inputClass}
          required
          value={value.shift}
          onChange={(event) => update("shift", event.target.value)}
        >
          <option value="">Selecione</option>
          <option>A</option>
          <option>B</option>
          <option>C</option>
          <option>D</option>
          <option value="Não identificado">Não identificado</option>
        </select>
      </Field>
      <Field label="Nome do responsável">
        <input
          className={inputClass}
          required
          value={value.responsible}
          onChange={(event) => update("responsible", event.target.value)}
        />
      </Field>
      <Field label="Status do processo">
        <select
          className={inputClass}
          value={value.status}
          onChange={(event) => update("status", event.target.value)}
        >
          <option>Avaliando</option>
          <option>Em Andamento</option>
          <option>Concluído</option>
        </select>
      </Field>
      <Field label="Observações">
        <input
          className={inputClass}
          value={value.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </Field>
    </div>
  );
}

export default function Home() {
  const [page, setPage] = useState<Page>("errors");
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [editingError, setEditingError] = useState<ErrorRecord | null>(null);
  const [editForm, setEditForm] = useState<ErrorForm>(emptyErrorForm);
  const [inventories, setInventories] = useState<InventoryRecord[]>([]);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const [errorFrom, setErrorFrom] = useState("");
  const [errorTo, setErrorTo] = useState("");
  const [inventoryFrom, setInventoryFrom] = useState("");
  const [inventoryTo, setInventoryTo] = useState("");
  const [errorTypeFilter, setErrorTypeFilter] = useState("");
  const [errorShiftFilter, setErrorShiftFilter] = useState("");
  const [errorStatusFilter, setErrorStatusFilter] = useState("");
  const [errorResponsibleFilter, setErrorResponsibleFilter] = useState("");
  const [inventoryMinAccuracy, setInventoryMinAccuracy] = useState("");
  const [inventoryMinMovements, setInventoryMinMovements] = useState("");
  const [inventoryMinAdjustments, setInventoryMinAdjustments] = useState("");
  const [inventoryMinExecution, setInventoryMinExecution] = useState("");

  const [errorForm, setErrorForm] = useState<ErrorForm>(emptyErrorForm);
  const [inventoryForm, setInventoryForm] =
    useState<InventoryForm>(emptyInventoryForm);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setMessage(error.message);

        setUser(
          data.session?.user
            ? {
                id: data.session.user.id,
                email: data.session.user.email,
              }
            : null
        );
        setAuthReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível verificar a sessão."
        );
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user
          ? { id: session.user.id, email: session.user.email }
          : null
      );
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const today = localToday();
    setErrorForm((current) => ({
      ...current,
      date: current.date || today,
    }));
    setInventoryForm((current) => ({
      ...current,
      date: current.date || today,
    }));
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setMessage("");

    const [errorsResult, inventoriesResult] = await Promise.all([
      supabase.from("errors").select("*").order("date", { ascending: false }),
      supabase
        .from("inventories")
        .select("*")
        .order("date", { ascending: false }),
    ]);

    if (errorsResult.error || inventoriesResult.error) {
      setMessage(
        errorsResult.error?.message ??
          inventoriesResult.error?.message ??
          "Não foi possível carregar os dados."
      );
      setLoading(false);
      return;
    }

    setErrors((errorsResult.data ?? []).map((row) => mapError(row)));
    setInventories(
      (inventoriesResult.data ?? []).map((row) => mapInventory(row))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadData();
    } else {
      setErrors([]);
      setInventories([]);
    }
  }, [user, loadData]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) setMessage(error.message);
  }

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(`Não foi possível criar a conta: ${error.message}`);
      return;
    }

    setIsRegistering(false);
    setPassword("");
    setConfirmPassword("");
    setMessage(
      "Cadastro criado. Se for solicitada a confirmação, confira seu e-mail e depois entre."
    );
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(error.message);
  }

  async function addError(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const { error } = await supabase.from("errors").insert({
      id: crypto.randomUUID(),
      date: errorForm.date,
      street: errorForm.street,
      building: errorForm.building,
      level: errorForm.level,
      apartment: errorForm.apartment,
      code: errorForm.code,
      physical: Number(errorForm.physical),
      system: Number(errorForm.system),
      type: errorForm.type,
      product_codes: errorForm.productCodes.trim(),
      adjustment: errorForm.adjustment,
      shift: errorForm.shift,
      responsible: errorForm.responsible,
      status: errorForm.status,
      notes: errorForm.notes,
    });

    if (error) {
      setMessage(`Não foi possível salvar o erro: ${error.message}`);
      return;
    }

    setErrorForm({
      ...emptyErrorForm,
      date: localToday(),
    });
    await loadData();
  }

  async function addInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const counted = Number(inventoryForm.counted);
    const accurate = Number(inventoryForm.accurate);
    const planned = Number(inventoryForm.planned);
    const executed = Number(inventoryForm.executed);

    if (accurate > counted) {
      setMessage(
        "Itens sem divergência não podem ser maiores que os itens contados."
      );
      return;
    }

    if (executed > planned) {
      setMessage(
        "Contagens executadas não podem ser maiores que as planejadas."
      );
      return;
    }

    const { error } = await supabase.from("inventories").insert({
      id: crypto.randomUUID(),
      date: inventoryForm.date,
      counted,
      accurate,
      movements: Number(inventoryForm.movements),
      adjustments: Number(inventoryForm.adjustments),
      planned,
      executed,
      notes: inventoryForm.notes,
    });

    if (error) {
      setMessage(`Não foi possível salvar o inventário: ${error.message}`);
      return;
    }

    setInventoryForm({
      ...emptyInventoryForm,
      date: localToday(),
    });
    await loadData();
  }

  async function saveErrorEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingError) return;

    setMessage("");

    const { error } = await supabase
      .from("errors")
      .update({
        date: editForm.date,
        street: editForm.street,
        building: editForm.building,
        level: editForm.level,
        apartment: editForm.apartment,
        code: editForm.code,
        physical: Number(editForm.physical),
        system: Number(editForm.system),
        type: editForm.type,
        product_codes: editForm.productCodes.trim(),
        adjustment: editForm.adjustment,
        shift: editForm.shift,
        responsible: editForm.responsible,
        status: editForm.status,
        notes: editForm.notes,
      })
      .eq("id", editingError.id);

    if (error) {
      setMessage(`Não foi possível atualizar o erro: ${error.message}`);
      return;
    }

    setEditingError(null);
    setEditForm(emptyErrorForm);
    setMessage("Registro de erro atualizado.");
    await loadData();
  }

  async function removeError(id: string) {
    if (!confirm("Excluir este registro de erro?")) return;

    const { error } = await supabase.from("errors").delete().eq("id", id);
    if (error) {
      setMessage(`Não foi possível excluir o erro: ${error.message}`);
      return;
    }

    await loadData();
  }

  async function removeInventory(id: string) {
    if (!confirm("Excluir este registro de inventário?")) return;

    const { error } = await supabase.from("inventories").delete().eq("id", id);
    if (error) {
      setMessage(`Não foi possível excluir o inventário: ${error.message}`);
      return;
    }

    await loadData();
  }

  const filteredErrors = errors.filter(
    (item) =>
      (!errorFrom || item.date >= errorFrom) &&
      (!errorTo || item.date <= errorTo) &&
      (!errorTypeFilter || item.type === errorTypeFilter) &&
      (!errorShiftFilter || item.shift === errorShiftFilter) &&
      (!errorStatusFilter || item.status === errorStatusFilter) &&
      (!errorResponsibleFilter ||
        item.responsible
          .toLowerCase()
          .includes(errorResponsibleFilter.toLowerCase()))
  );

  const filteredInventories = inventories.filter(
    (item) =>
      (!inventoryFrom || item.date >= inventoryFrom) &&
      (!inventoryTo || item.date <= inventoryTo) &&
      (!inventoryMinAccuracy ||
        percentage(item.accurate, item.counted) >=
          Number(inventoryMinAccuracy)) &&
      (!inventoryMinMovements ||
        item.movements >= Number(inventoryMinMovements)) &&
      (!inventoryMinAdjustments ||
        item.adjustments >= Number(inventoryMinAdjustments)) &&
      (!inventoryMinExecution ||
        percentage(item.executed, item.planned) >=
          Number(inventoryMinExecution))
  );

  const errorsByDate = Array.from(
    filteredErrors.reduce((byDate, item) => {
      byDate.set(item.date, (byDate.get(item.date) ?? 0) + 1);
      return byDate;
    }, new Map<string, number>()),
    ([label, value]) => ({ label, value })
  ).sort((a, b) => a.label.localeCompare(b.label));

  const inventoryByDate = Array.from(
    filteredInventories.reduce(
      (byDate, item) => {
        const totals = byDate.get(item.date) ?? {
          counted: 0,
          accurate: 0,
          movements: 0,
          planned: 0,
          executed: 0,
        };

        totals.counted += item.counted;
        totals.accurate += item.accurate;
        totals.movements += item.movements;
        totals.planned += item.planned;
        totals.executed += item.executed;
        byDate.set(item.date, totals);
        return byDate;
      },
      new Map<
        string,
        {
          counted: number;
          accurate: number;
          movements: number;
          planned: number;
          executed: number;
        }
      >()
    ),
    ([date, totals]) => ({ date, ...totals })
  ).sort((a, b) => a.date.localeCompare(b.date));

  const navigation: { id: Page; label: string }[] = [
    { id: "errors", label: "Lançar erros" },
    { id: "errorDashboard", label: "Dashboard de erros" },
    { id: "inventory", label: "Lançar inventário" },
    { id: "inventoryDashboard", label: "Dashboard de inventário" },
    { id: "base", label: "Base consolidada" },
  ];

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-4 text-slate-700">
        Verificando acesso...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8 text-slate-900">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-800">
            DMP · Controle interno
          </p>
          <h1 className="mt-2 text-2xl font-bold">Controle de Estoque</h1>
          <p className="mt-2 text-sm text-slate-600">
            {isRegistering
              ? "Preencha seus dados para criar uma conta e acessar o Controle de Estoque."
              : "Entre com seu e-mail e senha. Ainda não tem cadastro? Use a opção abaixo para criar sua conta."}
          </p>

          {message && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {message}
            </p>
          )}

          {isRegistering && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              O cadastro está aberto. Como novos usuários recebem acesso
              automaticamente, compartilhe o endereço do sistema somente com
              pessoas autorizadas.
            </p>
          )}

          <form
            className="mt-5 space-y-4"
            onSubmit={isRegistering ? signUp : signIn}
          >
            <Field label="E-mail">
              <input
                className={inputClass}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            <Field label="Senha">
              <input
                className={inputClass}
                type="password"
                required
                autoComplete={
                  isRegistering ? "new-password" : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            {isRegistering && (
              <Field label="Confirme a senha">
                <input
                  className={inputClass}
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </Field>
            )}

            <button className={`${buttonClass} w-full`} type="submit">
              {isRegistering ? "Criar cadastro" : "Entrar"}
            </button>
          </form>

          <button
            className={`${secondaryButtonClass} mt-4 w-full`}
            type="button"
            onClick={() => {
              setIsRegistering((current) => !current);
              setMessage("");
              setPassword("");
              setConfirmPassword("");
            }}
          >
            {isRegistering
              ? "Já tem cadastro? Voltar para entrar"
              : "Ainda não tem cadastro? Criar cadastro"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl bg-gradient-to-r from-slate-900 to-cyan-800 p-6 text-white shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-100">
                DMP · Controle interno
              </p>
              <h1 className="mt-2 text-3xl font-bold">Controle de Estoque</h1>
              <p className="mt-2 text-sm text-cyan-50">
                Registro de endereçamento, divergências, inventários e
                indicadores.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-cyan-50">{user.email}</span>
              <button
                className="rounded-lg border border-white/40 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                type="button"
                onClick={() => void loadData()}
              >
                Atualizar
              </button>
              <button
                className="rounded-lg border border-white/40 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                type="button"
                onClick={() => void signOut()}
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        {message && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {message}
          </div>
        )}

        {loading && (
          <p className="mt-3 text-sm text-slate-600">
            Carregando dados do Supabase...
          </p>
        )}

        <nav
          className="my-5 flex flex-wrap gap-2"
          aria-label="Menu principal"
        >
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={
                page === item.id ? buttonClass : secondaryButtonClass
              }
            >
              {item.label}
            </button>
          ))}
        </nav>

        {page === "errors" && (
          <>
            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">Novo registro de erro</h2>
              <p className="mb-5 mt-1 text-sm text-slate-500">
                A diferença entre quantidade física e sistema é calculada nos
                relatórios.
              </p>

              <form onSubmit={addError}>
                <ErrorFields value={errorForm} onChange={setErrorForm} />
                <button className={`${buttonClass} mt-5`} type="submit">
                  Adicionar ocorrência
                </button>
              </form>
            </section>

            {editingError && (
              <section className="mb-5 rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xl font-bold">
                  Editar registro de erro
                </h2>
                <form onSubmit={saveErrorEdit}>
                  <ErrorFields value={editForm} onChange={setEditForm} />
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button className={buttonClass} type="submit">
                      Salvar alterações
                    </button>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => {
                        setEditingError(null);
                        setEditForm(emptyErrorForm);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Registros de erros</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Endereço</th>
                      <th className="p-3">Código</th>
                      <th className="p-3">Físico</th>
                      <th className="p-3">Sistema</th>
                      <th className="p-3">Diferença</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Ajuste</th>
                      <th className="p-3">Turno</th>
                      <th className="p-3">Responsável</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {errors.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3">{formatDate(item.date)}</td>
                        <td className="p-3">
                          {item.street} / {item.building} / {item.level} /{" "}
                          {item.apartment}
                        </td>
                        <td className="p-3">{item.code}</td>
                        <td className="p-3">{formatNumber(item.physical)}</td>
                        <td className="p-3">{formatNumber(item.system)}</td>
                        <td className="p-3">
                          {formatNumber(item.physical - item.system)}
                        </td>
                        <td className="p-3">{item.type}</td>
                        <td className="p-3">{item.adjustment}</td>
                        <td className="p-3">{item.shift}</td>
                        <td className="p-3">{item.responsible}</td>
                        <td className="p-3">
  <span className={statusClass(item.status)}>{item.status}</span>
</td>
                        <td className="p-3">
                          <div className="flex flex-col items-start gap-2">
                            <button
                              type="button"
                              className="font-semibold text-cyan-800 hover:underline"
                              onClick={() => {
                                setMessage("");
                                setEditingError(item);
                                setEditForm(toErrorForm(item));
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="font-semibold text-red-700 hover:underline"
                              onClick={() => void removeError(item.id)}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {errors.length === 0 && (
                      <tr>
                        <td
                          colSpan={12}
                          className="p-6 text-center text-slate-500"
                        >
                          Nenhum erro registrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {page === "errorDashboard" && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Dashboard de erros</h2>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="De">
                  <input
                    className={inputClass}
                    type="date"
                    value={errorFrom}
                    onChange={(event) => setErrorFrom(event.target.value)}
                  />
                </Field>
                <Field label="Até">
                  <input
                    className={inputClass}
                    type="date"
                    value={errorTo}
                    onChange={(event) => setErrorTo(event.target.value)}
                  />
                </Field>
                <Field label="Tipo de erro">
                  <select
                    className={inputClass}
                    value={errorTypeFilter}
                    onChange={(event) => setErrorTypeFilter(event.target.value)}
                  >
                    <option value="">Todos os tipos</option>
                    {errorTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Turno">
                  <select
                    className={inputClass}
                    value={errorShiftFilter}
                    onChange={(event) => setErrorShiftFilter(event.target.value)}
                  >
                    <option value="">Todos os turnos</option>
                    {["A", "B", "C", "D", "Não identificado"].map((shift) => (
                      <option key={shift}>{shift}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    className={inputClass}
                    value={errorStatusFilter}
                    onChange={(event) => setErrorStatusFilter(event.target.value)}
                  >
                    <option value="">Todos os status</option>
                    {["Avaliando", "Em Andamento", "Concluído"].map(
                      (status) => (
                        <option key={status}>{status}</option>
                      )
                    )}
                  </select>
                </Field>
                <Field label="Responsável">
                  <input
                    className={inputClass}
                    value={errorResponsibleFilter}
                    onChange={(event) =>
                      setErrorResponsibleFilter(event.target.value)
                    }
                    placeholder="Filtrar por nome"
                  />
                </Field>
                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={() => {
                    setErrorFrom("");
                    setErrorTo("");
                    setErrorTypeFilter("");
                    setErrorShiftFilter("");
                    setErrorStatusFilter("");
                    setErrorResponsibleFilter("");
                  }}
                >
                  Limpar filtros
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Ocorrências"
                value={filteredErrors.length}
              />
              <SummaryCard
                label="Pendentes"
                value={
                  filteredErrors.filter(
                    (item) => item.status !== "Concluído"
                  ).length
                }
              />
              <SummaryCard
                label="Erros de endereçamento"
                value={
                  filteredErrors.filter(
                    (item) => item.type === "Endereçamento"
                  ).length
                }
              />
              <SummaryCard
                label="Ajustes realizados"
                value={
                  filteredErrors.filter(
                    (item) => item.adjustment === "Sim"
                  ).length
                }
              />
            </div>

            <MetricChart
              title="Todas as ocorrências por dia"
              data={errorsByDate}
              chartType="line"
              color="bg-cyan-700"
            />

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-bold">Ocorrências por tipo</h3>
                {errorTypes.map((type) => (
                  <p
                    key={type}
                    className="flex justify-between border-b py-2 text-sm"
                  >
                    <span>{type}</span>
                    <strong>
                      {
                        filteredErrors.filter((item) => item.type === type)
                          .length
                      }
                    </strong>
                  </p>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-bold">Ocorrências por turno</h3>
                {["A", "B", "C", "D", "Não identificado"].map((shift) => (
                  <p
                    key={shift}
                    className="flex justify-between border-b py-2 text-sm"
                  >
                    <span>
                      {shift === "Não identificado"
                        ? shift
                        : `Turno ${shift}`}
                    </span>
                    <strong>
                      {
                        filteredErrors.filter(
                          (item) => item.shift === shift
                        ).length
                      }
                    </strong>
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-bold">Processos por status</h3>
              {["Avaliando", "Em Andamento", "Concluído"].map((status) => (
                <p
                  key={status}
                  className="flex justify-between border-b py-2 text-sm"
                >
                  <span>{status}</span>
                  <strong>
                    {
                      filteredErrors.filter(
                        (item) => item.status === status
                      ).length
                    }
                  </strong>
                </p>
              ))}
            </div>
          </section>
        )}

        {page === "inventory" && (
          <>
            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">
                Novo fechamento diário de inventário
              </h2>
              <p className="mb-5 mt-1 text-sm text-slate-500">
                Informe os totais do dia. A acuracidade e a execução são
                calculadas automaticamente.
              </p>

              <form
                onSubmit={addInventory}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <Field label="Data">
                  <input
                    className={inputClass}
                    type="date"
                    required
                    value={inventoryForm.date}
                    onChange={(event) =>
                      setInventoryForm({
                        ...inventoryForm,
                        date: event.target.value,
                      })
                    }
                  />
                </Field>

                {(
                  [
                    ["Itens contados", "counted"],
                    ["Itens sem divergência", "accurate"],
                    ["Erros de movimentação", "movements"],
                    ["Ajustes de estoque", "adjustments"],
                    ["Contagens planejadas", "planned"],
                    ["Contagens executadas", "executed"],
                  ] as const
                ).map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={inventoryForm[key]}
                      onChange={(event) =>
                        setInventoryForm({
                          ...inventoryForm,
                          [key]: event.target.value,
                        })
                      }
                    />
                  </Field>
                ))}

                <Field label="Observações">
                  <input
                    className={inputClass}
                    value={inventoryForm.notes}
                    onChange={(event) =>
                      setInventoryForm({
                        ...inventoryForm,
                        notes: event.target.value,
                      })
                    }
                  />
                </Field>

                <div className="sm:col-span-2 lg:col-span-4">
                  <button className={buttonClass} type="submit">
                    Adicionar fechamento
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">
                Registros de inventário
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Contados</th>
                      <th className="p-3">Sem divergência</th>
                      <th className="p-3">Acuracidade</th>
                      <th className="p-3">Erros movimentação</th>
                      <th className="p-3">Ajustes</th>
                      <th className="p-3">Planejadas</th>
                      <th className="p-3">Executadas</th>
                      <th className="p-3">Execução</th>
                      <th className="p-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventories.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3">{formatDate(item.date)}</td>
                        <td className="p-3">{formatNumber(item.counted)}</td>
                        <td className="p-3">{formatNumber(item.accurate)}</td>
                        <td className="p-3">
                          {formatPercent(
                            percentage(item.accurate, item.counted)
                          )}
                        </td>
                        <td className="p-3">
                          {formatNumber(item.movements)}
                        </td>
                        <td className="p-3">
                          {formatNumber(item.adjustments)}
                        </td>
                        <td className="p-3">{formatNumber(item.planned)}</td>
                        <td className="p-3">{formatNumber(item.executed)}</td>
                        <td className="p-3">
                          {formatPercent(
                            percentage(item.executed, item.planned)
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            className="font-semibold text-red-700 hover:underline"
                            onClick={() => void removeInventory(item.id)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}

                    {inventories.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="p-6 text-center text-slate-500"
                        >
                          Nenhum inventário registrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {page === "inventoryDashboard" && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">
                Dashboard de inventário
              </h2>

              <div className="flex flex-wrap items-end gap-3">
                <Field label="De">
                  <input
                    className={inputClass}
                    type="date"
                    value={inventoryFrom}
                    onChange={(event) =>
                      setInventoryFrom(event.target.value)
                    }
                  />
                </Field>

                <Field label="Até">
                  <input
                    className={inputClass}
                    type="date"
                    value={inventoryTo}
                    onChange={(event) => setInventoryTo(event.target.value)}
                  />
                </Field>

                <Field label="Acuracidade mínima (%)">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="100"
                    value={inventoryMinAccuracy}
                    onChange={(event) =>
                      setInventoryMinAccuracy(event.target.value)
                    }
                    placeholder="Ex.: 95"
                  />
                </Field>

                <Field label="Erros de movimentação (mín.)">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    value={inventoryMinMovements}
                    onChange={(event) =>
                      setInventoryMinMovements(event.target.value)
                    }
                    placeholder="Ex.: 1"
                  />
                </Field>

                <Field label="Ajustes de estoque (mín.)">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    value={inventoryMinAdjustments}
                    onChange={(event) =>
                      setInventoryMinAdjustments(event.target.value)
                    }
                    placeholder="Ex.: 1"
                  />
                </Field>

                <Field label="Execução mínima (%)">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    value={inventoryMinExecution}
                    onChange={(event) =>
                      setInventoryMinExecution(event.target.value)
                    }
                    placeholder="Ex.: 90"
                  />
                </Field>

                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={() => {
                    setInventoryFrom("");
                    setInventoryTo("");
                    setInventoryMinAccuracy("");
                    setInventoryMinMovements("");
                    setInventoryMinAdjustments("");
                    setInventoryMinExecution("");
                  }}
                >
                  Limpar filtros
                </button>
              </div>
            </div>

            {(() => {
              const counted = filteredInventories.reduce(
                (sum, item) => sum + item.counted,
                0
              );
              const accurate = filteredInventories.reduce(
                (sum, item) => sum + item.accurate,
                0
              );
              const planned = filteredInventories.reduce(
                (sum, item) => sum + item.planned,
                0
              );
              const executed = filteredInventories.reduce(
                (sum, item) => sum + item.executed,
                0
              );
              const movements = filteredInventories.reduce(
                (sum, item) => sum + item.movements,
                0
              );
              const adjustments = filteredInventories.reduce(
                (sum, item) => sum + item.adjustments,
                0
              );

              return (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard
                      label="Acuracidade do estoque"
                      value={formatPercent(percentage(accurate, counted))}
                    />
                    <SummaryCard
                      label="Execução de contagens"
                      value={formatPercent(percentage(executed, planned))}
                    />
                    <SummaryCard
                      label="Erros de movimentação"
                      value={formatNumber(movements)}
                    />
                    <SummaryCard
                      label="Ajustes de estoque"
                      value={formatNumber(adjustments)}
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <MetricChart
                      title="Acuracidade do estoque por dia"
                      data={inventoryByDate.map((item) => ({
                        label: item.date,
                        value: percentage(item.accurate, item.counted),
                      }))}
                      color="bg-indigo-600"
                      formatValue={formatPercent}
                      chartType="line"
                    />

                    <MetricChart
                      title="Erros de movimentação por dia"
                      data={inventoryByDate.map((item) => ({
                        label: item.date,
                        value: item.movements,
                      }))}
                      color="bg-rose-600"
                      chartType="column"
                    />

                    <MetricChart
                      title="Execução de contagens por dia"
                      data={inventoryByDate.map((item) => ({
                        label: item.date,
                        value: percentage(item.executed, item.planned),
                      }))}
                      color="bg-violet-600"
                      formatValue={formatPercent}
                      chartType="line"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 font-bold">Resumo do período</h3>
                    <p className="text-sm text-slate-700">
                      {formatNumber(accurate)} itens sem divergência de{" "}
                      {formatNumber(counted)} contados.{" "}
                      {formatNumber(executed)} contagens executadas de{" "}
                      {formatNumber(planned)} planejadas.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 font-bold">Acompanhamento por dia</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left text-sm">
                        <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                          <tr>
                            <th className="p-3">Data</th>
                            <th className="p-3">Contados</th>
                            <th className="p-3">Sem divergência</th>
                            <th className="p-3">Acuracidade</th>
                            <th className="p-3">Planejadas</th>
                            <th className="p-3">Executadas</th>
                            <th className="p-3">Execução</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredInventories.map((item) => (
                            <tr key={item.id}>
                              <td className="p-3">{formatDate(item.date)}</td>
                              <td className="p-3">
                                {formatNumber(item.counted)}
                              </td>
                              <td className="p-3">
                                {formatNumber(item.accurate)}
                              </td>
                              <td className="p-3">
                                {formatPercent(
                                  percentage(item.accurate, item.counted)
                                )}
                              </td>
                              <td className="p-3">
                                {formatNumber(item.planned)}
                              </td>
                              <td className="p-3">
                                {formatNumber(item.executed)}
                              </td>
                              <td className="p-3">
                                {formatPercent(
                                  percentage(item.executed, item.planned)
                                )}
                              </td>
                            </tr>
                          ))}

                          {filteredInventories.length === 0 && (
                            <tr>
                              <td
                                colSpan={7}
                                className="p-6 text-center text-slate-500"
                              >
                                Sem dados para o período selecionado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </section>
        )}

        {page === "base" && (
          <section className="space-y-5">
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
              Os registros desta tela são carregados do banco Supabase e
              compartilhados com os usuários autorizados.
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    Base consolidada de erros
                  </h2>
                  <p className="text-sm text-slate-500">
                    Uma linha para cada ocorrência registrada.
                  </p>
                </div>

                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={() =>
                    downloadCsv("base-erros-dmp.csv", [
                      [
                        "Data",
                        "Rua",
                        "Prédio",
                        "Nível",
                        "Apartamento",
                        "Código",
                        "Físico",
                        "Sistema",
                        "Diferença",
                        "Tipo",
                        "Produtos no endereço",
                        "Ajuste",
                        "Turno",
                        "Responsável",
                        "Status",
                        "Observações",
                      ],
                      ...errors.map((item) => [
                        formatDate(item.date),
                        item.street,
                        item.building,
                        item.level,
                        item.apartment,
                        item.code,
                        item.physical,
                        item.system,
                        item.physical - item.system,
                        item.type,
                        item.productCodes,
                        item.adjustment,
                        item.shift,
                        item.responsible,
                        item.status,
                        item.notes,
                      ]),
                    ])
                  }
                >
                  Exportar erros CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Rua</th>
                      <th className="p-3">Prédio</th>
                      <th className="p-3">Nível</th>
                      <th className="p-3">Apartamento</th>
                      <th className="p-3">Código</th>
                      <th className="p-3">Físico</th>
                      <th className="p-3">Sistema</th>
                      <th className="p-3">Diferença</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {errors.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3">{formatDate(item.date)}</td>
                        <td className="p-3">{item.street}</td>
                        <td className="p-3">{item.building}</td>
                        <td className="p-3">{item.level}</td>
                        <td className="p-3">{item.apartment}</td>
                        <td className="p-3">{item.code}</td>
                        <td className="p-3">{formatNumber(item.physical)}</td>
                        <td className="p-3">{formatNumber(item.system)}</td>
                        <td className="p-3">
                          {formatNumber(item.physical - item.system)}
                        </td>
                        <td className="p-3">{item.type}</td>
                        <td className="p-3">
  <span className={statusClass(item.status)}>{item.status}</span>
</td>
                      </tr>
                    ))}

                    {errors.length === 0 && (
                      <tr>
                        <td
                          colSpan={11}
                          className="p-6 text-center text-slate-500"
                        >
                          Nenhum erro registrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    Base consolidada de inventário
                  </h2>
                  <p className="text-sm text-slate-500">
                    Fechamentos diários e indicadores de contagem.
                  </p>
                </div>

                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={() =>
                    downloadCsv("base-inventario-dmp.csv", [
                      [
                        "Data",
                        "Itens contados",
                        "Sem divergência",
                        "Acuracidade",
                        "Erros movimentação",
                        "Ajustes",
                        "Planejadas",
                        "Executadas",
                        "Execução",
                        "Observações",
                      ],
                      ...inventories.map((item) => [
                        formatDate(item.date),
                        item.counted,
                        item.accurate,
                        formatPercent(
                          percentage(item.accurate, item.counted)
                        ),
                        item.movements,
                        item.adjustments,
                        item.planned,
                        item.executed,
                        formatPercent(
                          percentage(item.executed, item.planned)
                        ),
                        item.notes,
                      ]),
                    ])
                  }
                >
                  Exportar inventário CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Contados</th>
                      <th className="p-3">Sem divergência</th>
                      <th className="p-3">Acuracidade</th>
                      <th className="p-3">Erros movimentação</th>
                      <th className="p-3">Ajustes</th>
                      <th className="p-3">Planejadas</th>
                      <th className="p-3">Executadas</th>
                      <th className="p-3">Execução</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventories.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3">{formatDate(item.date)}</td>
                        <td className="p-3">{formatNumber(item.counted)}</td>
                        <td className="p-3">{formatNumber(item.accurate)}</td>
                        <td className="p-3">
                          {formatPercent(
                            percentage(item.accurate, item.counted)
                          )}
                        </td>
                        <td className="p-3">
                          {formatNumber(item.movements)}
                        </td>
                        <td className="p-3">
                          {formatNumber(item.adjustments)}
                        </td>
                        <td className="p-3">{formatNumber(item.planned)}</td>
                        <td className="p-3">{formatNumber(item.executed)}</td>
                        <td className="p-3">
                          {formatPercent(
                            percentage(item.executed, item.planned)
                          )}
                        </td>
                      </tr>
                    ))}

                    {inventories.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="p-6 text-center text-slate-500"
                        >
                          Nenhum inventário registrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <p className="mt-5 text-center text-xs text-slate-500">
          Controle de erros, endereçamento e inventários · DMP
        </p>
      </div>
    </main>
  );
}








