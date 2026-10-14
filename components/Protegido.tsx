"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { registrarError } from "@/lib/diagnostico/errores";

interface Props {
  /** Parte de la app que protege (queda en el registro de errores). */
  nombre: string;
  children: ReactNode;
  /**
   * Qué mostrar si falla. Por defecto nada: la pieza se oculta y el resto de
   * la app (mapa, GPS) sigue funcionando. Recibe `reintentar` para volver a
   * montarla.
   */
  fallback?: (reintentar: () => void) => ReactNode;
}

interface State {
  fallo: boolean;
}

/**
 * Protector de una parte de la pantalla (ADR-0039): si un componente falla,
 * sin él React desmonta toda la app y Next muestra "This page couldn't load"
 * (sin mapa ni GPS, también sin señal). Con él solo cae esa parte, y el error
 * queda registrado para diagnosticarlo.
 */
export class Protegido extends Component<Props, State> {
  override state: State = { fallo: false };

  static getDerivedStateFromError(): State {
    return { fallo: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    registrarError(this.props.nombre, error, info.componentStack);
    console.error(`[Rio Map] falló "${this.props.nombre}":`, error);
  }

  reintentar = () => this.setState({ fallo: false });

  override render() {
    if (this.state.fallo) return this.props.fallback?.(this.reintentar) ?? null;
    return this.props.children;
  }
}
