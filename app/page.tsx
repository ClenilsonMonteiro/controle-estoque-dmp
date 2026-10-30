"use client";

import { useEffect, useState, type FormEvent } from "react";

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

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

export default function Home() {
  const [page, setPage] = useState<Page>("errors");
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [inventories, setInventories] = useState<InventoryRecord[]>([]);
  const [ready, setReady] = useState(false);

  const [errorFrom, setErrorFrom] = useState("");
  const [errorTo, setErrorTo] = useState("");
  const [inventoryFrom, setInventoryFrom] = useState("");
  const [inventoryTo, setInventoryTo] = useState("");

  const [errorForm, setErrorForm] = useState({
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
  });

  const [inventoryForm, setInventoryForm] = useState({
    date: "",
    counted: "",
    accurate: "",
    movements: "",
    adjustments: "",
    planned: "",
    executed: "",
    notes: "",
  });

  useEffect(() => {
    setErrorForm((current) => ({ ...current, date: localToday() }));
setInventoryForm((current) => ({ ...current, date: localToday() }));
    try {
      const savedErrors = localStorage.getItem("dmp-control-errors");
      const savedInventories = localStorage.getItem("dmp-control-inventories");

      if (savedErrors) setErrors(JSON.parse(savedErrors) as ErrorRecord[]);
      if (savedInventories)
        setInventories(JSON.parse(savedInventories) as InventoryRecord[]);
    } catch {
      // Se os dados salvos não puderem ser lidos, inicia sem registros.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("dmp-control-errors", JSON.stringify(errors));
    localStorage.setItem(
      "dmp-control-inventories",
      JSON.stringify(inventories)
    );
  }, [errors, inventories, ready]);

  function addError(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const physical = Number(errorForm.physical);
    const system = Number(errorForm.system);

    const newError: ErrorRecord = {
      ...errorForm,
      id: crypto.randomUUID(),
      physical,
      system,
      productCodes: errorForm.productCodes.trim(),
    };

    setErrors((current) => [newError, ...current]);
    setErrorForm({
      date: localToday(),
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
    });
  }

  function addInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const counted = Number(inventoryForm.counted);
    const accurate = Number(inventoryForm.accurate);
    const planned = Number(inventoryForm.planned);
    const executed = Number(inventoryForm.executed);

    if (accurate > counted) {
      alert("Itens sem divergência não podem ser maiores que os itens contados.");
      return;
    }

    if (executed > planned) {
      alert("Contagens executadas não podem ser maiores que as planejadas.");
      return;
    }

    const newInventory: InventoryRecord = {
      ...inventoryForm,
      id: crypto.randomUUID(),
      counted,
      accurate,
      movements: Number(inventoryForm.movements),
      adjustments: Number(inventoryForm.adjustments),
      planned,
      executed,
    };

    setInventories((current) => [newInventory, ...current]);
    setInventoryForm({
      date: localToday(),
      counted: "",
      accurate: "",
      movements: "",
      adjustments: "",
      planned: "",
      executed: "",
      notes: "",
    });
  }

  function removeError(id: string) {
    if (confirm("Excluir este registro de erro?")) {
      setErrors((current) => current.filter((item) => item.id !== id));
    }
  }

  function removeInventory(id: string) {
    if (confirm("Excluir este registro de inventário?")) {
      setInventories((current) => current.filter((item) => item.id !== id));
    }
  }

  const filteredErrors = errors.filter(
    (item) =>
      (!errorFrom || item.date >= errorFrom) &&
      (!errorTo || item.date <= errorTo)
  );

  const filteredInventories = inventories.filter(
    (item) =>
      (!inventoryFrom || item.date >= inventoryFrom) &&
      (!inventoryTo || item.date <= inventoryTo)
  );

  const errorTypes = [
    "Sistema",
    "Endereçamento",
    "Pessoa/Processo",
    "Movimentação",
    "Múltiplos produtos",
    "Outros",
  ];

  const navigation: { id: Page; label: string }[] = [
    { id: "errors", label: "Lançar erros" },
    { id: "errorDashboard", label: "Dashboard de erros" },
    { id: "inventory", label: "Lançar inventário" },
    { id: "inventoryDashboard", label: "Dashboard de inventário" },
    { id: "base", label: "Base consolidada" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl bg-gradient-to-r from-slate-900 to-cyan-800 p-6 text-white shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-100">
            DMP · Controle interno
          </p>
          <h1 className="mt-2 text-3xl font-bold">Controle de Estoque</h1>
          <p className="mt-2 text-sm text-cyan-50">
            Registro de endereçamento, divergências, inventários e indicadores
            para acompanhamento gerencial.
          </p>
        </header>

        <nav className="my-5 flex flex-wrap gap-2" aria-label="Menu principal">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={
                page === item.id
                  ? buttonClass
                  : secondaryButtonClass
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
                Registre uma ocorrência. A diferença entre quantidade física e
                sistema é calculada no relatório.
              </p>

              <form onSubmit={addError}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Data">
                    <input
                      className={inputClass}
                      type="date"
                      required
                      value={errorForm.date}
                      onChange={(event) =>
                        setErrorForm({ ...errorForm, date: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Rua">
                    <input
                      className={inputClass}
                      required
                      placeholder="Ex.: R01"
                      value={errorForm.street}
                      onChange={(event) =>
                        setErrorForm({
                          ...errorForm,
                          street: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Prédio">
                    <input
                      className={inputClass}
                      required
                      placeholder="Ex.: P02"
                      value={errorForm.building}
                      onChange={(event) =>
                        setErrorForm({
                          ...errorForm,
                          building: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Nível">
                    <input
                      className={inputClass}
                      required
                      placeholder="Ex.: N03"
                      value={errorForm.level}
                      onChange={(event) =>
                        setErrorForm({ ...errorForm, level: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Apartamento">
                    <input
                      className={inputClass}
                      required
                      placeholder="Ex.: A04"
                      value={errorForm.apartment}
                      onChange={(event) =>
                        setErrorForm({
                          ...errorForm,
                          apartment: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Código do produto">
                    <input
                      className={inputClass}
                      required
                      value={errorForm.code}
                      onChange={(event) =>
                        setErrorForm({ ...errorForm, code: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Quantidade física">
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={errorForm.physical}
                      onChange={(event) =>
                        setErrorForm({
                          ...errorForm,
                          physical: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Quantidade no sistema">
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={errorForm.system}
                      onChange={(event) =>
                        setErrorForm({
                          ...errorForm,
                          system: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Tipo de erro">
                    <select
                      className={inputClass}
                      required
                      value={errorForm.type}
                      onChange={(event) =>
                        setErrorForm({ ...errorForm, type: event.target.value })
                      }
                    >
                      <option value="">Selecione</option>
                      {errorTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </Field>

                  {errorForm.type === "Múltiplos produtos" && (
                    <Field label="Códigos dos produtos no endereço">
                      <input
                        className={inputClass}
                        required
                        placeholder="Separe os códigos por vírgula"
                        value={errorForm.productCodes}
                        onChange={(event) =>
                          setErrorForm({
                            ...errorForm,
                            productCodes: event.target.value,
                          })
                        }
                      />
                    </Field>
                  )}

                  <Field label="Ajuste no sistema?">
                    <select
                      className={inputClass}
                      value={errorForm.adjustment}
                      onChange={(event) =>
                        setErrorForm({
                          ...errorForm,
                          adjustment: event.target.value,
                        })
                      }
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
                      value={errorForm.shift}
                      onChange={(event) =>
                        setErrorForm({ ...errorForm, shift: event.target.value })
                      }
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
                      value={errorForm.responsible}
                      onChange={(event) =>
                        setErrorForm({
                          ...errorForm,
                          responsible: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Status do processo">
                    <select
                      className={inputClass}
                      value={errorForm.status}
                      onChange={(event) =>
                        setErrorForm({ ...errorForm, status: event.target.value })
                      }
                    >
                      <option>Avaliando</option>
                      <option>Em Andamento</option>
                      <option>Concluído</option>
                    </select>
                  </Field>
                  <Field label="Observações">
                    <input
                      className={inputClass}
                      placeholder="Causa provável ou ação tomada"
                      value={errorForm.notes}
                      onChange={(event) =>
                        setErrorForm({ ...errorForm, notes: event.target.value })
                      }
                    />
                  </Field>
                </div>

                <button className={`${buttonClass} mt-5`} type="submit">
                  Adicionar ocorrência
                </button>
              </form>
            </section>

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
                        <td className="p-3">{item.date}</td>
                        <td className="p-3">
                          {item.street} / {item.building} / {item.level} /{" "}
                          {item.apartment}
                        </td>
                        <td className="p-3">{item.code}</td>
                        <td className="p-3">{formatNumber(item.physical)}</td>
                        <td className="p-3">{formatNumber(item.system)}</td>
                        <td
                          className={`p-3 font-semibold ${
                            item.physical - item.system === 0
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          {formatNumber(item.physical - item.system)}
                        </td>
                        <td className="p-3">{item.type}</td>
                        <td className="p-3">{item.adjustment}</td>
                        <td className="p-3">{item.shift}</td>
                        <td className="p-3">{item.responsible}</td>
                        <td className="p-3">{item.status}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            className="font-semibold text-red-700 hover:underline"
                            onClick={() => removeError(item.id)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                    {errors.length === 0 && (
                      <tr>
                        <td colSpan={12} className="p-6 text-center text-slate-500">
                          Nenhum erro registrado ainda.
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
                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={() => {
                    setErrorFrom("");
                    setErrorTo("");
                  }}
                >
                  Limpar período
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Ocorrências" value={filteredErrors.length} />
              <SummaryCard
                label="Pendentes"
                value={
                  filteredErrors.filter((item) => item.status !== "Concluído")
                    .length
                }
              />
              <SummaryCard
                label="Erros de endereçamento"
                value={
                  filteredErrors.filter((item) => item.type === "Endereçamento")
                    .length
                }
              />
              <SummaryCard
                label="Ajustes realizados"
                value={
                  filteredErrors.filter((item) => item.adjustment === "Sim")
                    .length
                }
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-bold">Ocorrências por tipo</h3>
                {errorTypes.map((type) => {
                  const count = filteredErrors.filter(
                    (item) => item.type === type
                  ).length;
                  return (
                    <p
                      key={type}
                      className="flex justify-between border-b py-2 text-sm"
                    >
                      <span>{type}</span>
                      <strong>{count}</strong>
                    </p>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-bold">Ocorrências por turno</h3>{["A", "B", "C", "D", "Não identificado"].map((shift) => (
  <p
    key={shift}
    className="flex justify-between border-b py-2 text-sm"
  >
    <span>
      {shift === "Não identificado" ? shift : `Turno ${shift}`}
    </span>
    <strong>
      {filteredErrors.filter((item) => item.shift === shift).length}
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
                      filteredErrors.filter((item) => item.status === status)
                        .length
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
                Informe os totais do dia. A acuracidade e o percentual de
                execução são calculados automaticamente.
              </p>

              <form onSubmit={addInventory}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

                  {[
                    ["Itens contados", "counted"],
                    ["Itens sem divergência", "accurate"],
                    ["Erros de movimentação", "movements"],
                    ["Ajustes de estoque", "adjustments"],
                    ["Contagens planejadas", "planned"],
                    ["Contagens executadas", "executed"],
                  ].map(([label, key]) => (
                    <Field key={key} label={label}>
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={
                          inventoryForm[key as keyof typeof inventoryForm]
                        }
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
                      placeholder="Área, causa ou comentário"
                      value={inventoryForm.notes}
                      onChange={(event) =>
                        setInventoryForm({
                          ...inventoryForm,
                          notes: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>

                <button className={`${buttonClass} mt-5`} type="submit">
                  Adicionar fechamento
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Registros de inventário</h2>
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
                        <td className="p-3">{item.date}</td>
                        <td className="p-3">{formatNumber(item.counted)}</td>
                        <td className="p-3">{formatNumber(item.accurate)}</td>
                        <td className="p-3">
                          {formatPercent(
                            percentage(item.accurate, item.counted)
                          )}
                        </td>
                        <td className="p-3">{formatNumber(item.movements)}</td>
                        <td className="p-3">{formatNumber(item.adjustments)}</td>
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
                            onClick={() => removeInventory(item.id)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                    {inventories.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-500">
                          Nenhum inventário registrado ainda.
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
              <h2 className="mb-4 text-xl font-bold">Dashboard de inventário</h2>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="De">
                  <input
                    className={inputClass}
                    type="date"
                    value={inventoryFrom}
                    onChange={(event) => setInventoryFrom(event.target.value)}
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
                <button
                  className={secondaryButtonClass}
                  type="button"
                  onClick={() => {
                    setInventoryFrom("");
                    setInventoryTo("");
                  }}
                >
                  Limpar período
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

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 font-bold">Resumo do período</h3>
                    <p className="text-sm text-slate-700">
                      {formatNumber(accurate)} itens sem divergência de{" "}
                      {formatNumber(counted)} itens contados.{" "}
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
                              <td className="p-3">{item.date}</td>
                              <td className="p-3">{item.counted}</td>
                              <td className="p-3">{item.accurate}</td>
                              <td className="p-3">
                                {formatPercent(
                                  percentage(item.accurate, item.counted)
                                )}
                              </td>
                              <td className="p-3">{item.planned}</td>
                              <td className="p-3">{item.executed}</td>
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Os registros são armazenados localmente neste navegador e
              computador. Use os botões de exportação para baixar cópias em CSV.
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Base consolidada de erros</h2>
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
                        item.date,
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
                        <td className="p-3">{item.date}</td>
                        <td className="p-3">{item.street}</td>
                        <td className="p-3">{item.building}</td>
                        <td className="p-3">{item.level}</td>
                        <td className="p-3">{item.apartment}</td>
                        <td className="p-3">{item.code}</td>
                        <td className="p-3">{item.physical}</td>
                        <td className="p-3">{item.system}</td>
                        <td className="p-3">{item.physical - item.system}</td>
                        <td className="p-3">{item.type}</td>
                        <td className="p-3">{item.status}</td>
                      </tr>
                    ))}
                    {errors.length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-6 text-center text-slate-500">
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
                        item.date,
                        item.counted,
                        item.accurate,
                        formatPercent(percentage(item.accurate, item.counted)),
                        item.movements,
                        item.adjustments,
                        item.planned,
                        item.executed,
                        formatPercent(percentage(item.executed, item.planned)),
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
                        <td className="p-3">{item.date}</td>
                        <td className="p-3">{item.counted}</td>
                        <td className="p-3">{item.accurate}</td>
                        <td className="p-3">
                          {formatPercent(percentage(item.accurate, item.counted))}
                        </td>
                        <td className="p-3">{item.movements}</td>
                        <td className="p-3">{item.adjustments}</td>
                        <td className="p-3">{item.planned}</td>
                        <td className="p-3">{item.executed}</td>
                        <td className="p-3">
                          {formatPercent(percentage(item.executed, item.planned))}
                        </td>
                      </tr>
                    ))}
                    {inventories.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-500">
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
