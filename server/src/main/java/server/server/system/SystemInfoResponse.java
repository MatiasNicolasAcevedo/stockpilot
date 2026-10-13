package server.server.system;

/** Identificación pública de la aplicación: sin datos de entorno, usuarios ni configuración. */
public record SystemInfoResponse(String name, String version) {}
