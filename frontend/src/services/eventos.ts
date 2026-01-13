import { api } from "./api";

export async function createEvento(eventoData: any, token: string) {
  const res = await api.post("/eventos", eventoData, {
    headers: {
      Authorization: `Bearer ${token}`, // 👈 token del login
    },
  });
  return res.data;
}


export async function getEventos() {
  const res = await api.get("/eventos");
  return res.data;
}

// HU 4.1: Cancelar mi propio evento
export const cancelarEventoPropio = async (idEvento: number, motivo: string) => {
    const response = await api.patch(`/eventos/${idEvento}/cancelar`, null, {
        params: { motivo }
    });
    return response.data;
};

// HU 4.2: Solicitar baja (Usuario Externo)
export const solicitarBajaEvento = async (idEvento: number, motivo: string) => {
    const response = await api.patch(`/eventos/${idEvento}/solicitar-eliminacion`, null, {
        params: { motivo }
    });
    return response.data;
};

// HU 4.3: Eliminar como Administrador
export const adminEliminarEvento = async (idEvento: number, motivo: string) => {
    const response = await api.patch(`/eventos/${idEvento}/admin-eliminar`, null, {
        params: { motivo }
    });
    return response.data;
};