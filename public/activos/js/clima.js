/* SECTION: Climate Page Config and Data */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-tertiary-fixed-variant": "#474746",
                        "primary-fixed": "#8afaa7",
                        "surface-container": "#edeeef",
                        "surface-dim": "#d9dadb",
                        "on-surface": "#191c1d",
                        "tertiary-fixed": "#e4e2e1",
                        "inverse-on-surface": "#f0f1f2",
                        "secondary-container": "#b8f568",
                        "surface-variant": "#e1e3e4",
                        "primary-fixed-dim": "#6edd8d",
                        "on-surface-variant": "#3e4a3f",
                        "inverse-surface": "#2e3132",
                        "surface-container-high": "#e7e8e9",
                        "on-secondary-fixed-variant": "#304f00",
                        "on-primary-fixed-variant": "#005227",
                        "on-tertiary": "#ffffff",
                        "surface-container-lowest": "#ffffff",
                        "secondary-fixed-dim": "#9dd84f",
                        "outline": "#6e7a6e",
                        "inverse-primary": "#6edd8d",
                        "on-primary": "#ffffff",
                        "on-primary-fixed": "#00210c",
                        "secondary": "#426900",
                        "on-secondary": "#ffffff",
                        "on-error": "#ffffff",
                        "surface-container-low": "#f3f4f5",
                        "surface": "#f8f9fa",
                        "on-error-container": "#93000a",
                        "primary": "#006b34",
                        "tertiary": "#5c5c5c",
                        "error-container": "#ffdad6",
                        "on-tertiary-container": "#fffcfb",
                        "secondary-fixed": "#b8f568",
                        "background": "#f8f9fa",
                        "surface-tint": "#006d35",
                        "surface-container-highest": "#e1e3e4",
                        "on-primary-container": "#f6fff3",
                        "outline-variant": "#bdcabc",
                        "tertiary-container": "#757474",
                        "on-secondary-fixed": "#112000",
                        "error": "#ba1a1a",
                        "on-tertiary-fixed": "#1b1c1c",
                        "primary-container": "#008643",
                        "surface-bright": "#f8f9fa",
                        "on-secondary-container": "#467000",
                        "tertiary-fixed-dim": "#c8c6c5",
                        "on-background": "#191c1d"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "margin-desktop": "64px",
                        "container-max": "1280px",
                        "gutter": "24px",
                        "margin-mobile": "16px",
                        "unit": "4px"
                    },
                    "fontFamily": {
                      "headline-lg": ["Franklin", "Hanken Grotesk", "sans-serif"],
                      "headline-lg-mobile": ["Franklin", "Hanken Grotesk", "sans-serif"],
                        "body-lg": ["Franklin", "Hanken Grotesk", "sans-serif"],
                        "headline-md": ["Franklin", "Hanken Grotesk", "sans-serif"],
                        "body-md": ["Libre Franklin", "Franklin", "sans-serif"],
                        "headline-xl": ["Montserrat", "Franklin", "sans-serif"],
                      "label-md": ["Franklin", "Hanken Grotesk", "sans-serif"]
                    },
                    "fontSize": {
                        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
                        "headline-lg-mobile": ["28px", { "lineHeight": "36px", "fontWeight": "700" }],
                        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
                        "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "700" }],
                        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
                        "headline-xl": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "800" }],
                        "label-md": ["14px", { "lineHeight": "20px", "fontWeight": "600" }]
                    }
                }
            }
        };

window.climaReasons = [
  {
    icon: "thunderstorm",
    title: "1. Prevención de riesgos climáticos",
    text: "Eventos extremos como temperaturas altas o bajas, sequías, radiación solar, lluvias intensas o vientos fuertes pueden afectar seriamente la producción agrícola. Un sistema de monitoreo permite anticipar estos fenómenos y tomar medidas preventivas."
  },
  {
    icon: "water_drop",
    title: "2. Optimización de recursos",
    text: "Con datos precisos de temperatura, humedad y precipitaciones, los agricultores pueden programar mejor el riego, la fertilización y el control de plagas, reduciendo costos y evitando el uso innecesario de insumos."
  },
  {
    icon: "public",
    title: "3. Adaptación al cambio climático",
    text: "El monitoreo constante permite identificar patrones y variaciones en el clima, lo cual es clave para desarrollar estrategias de adaptación a largo plazo y fortalecer la resiliencia del sector agrícola."
  }
];

window.climaKpis = [
  { icon: "device_thermostat", color: "error", value: "21.1°", label: "Temperatura (°C)" },
  { icon: "humidity_percentage", color: "primary", value: "68%", label: "Humedad (%)" },
  { icon: "air", color: "secondary", value: "13.8", label: "Viento (km/h)" },
  { icon: "compress", color: "tertiary", value: "1012", label: "Presión (hPa)" }
];

window.climaHistory = [
  { date: "07-may.", maxTemp: "24.9", minTemp: "15.5", humidity: "71", wind: "12.8", rain: "1.2" },
  { date: "08-may.", maxTemp: "24.8", minTemp: "12.1", humidity: "63", wind: "11.1", rain: "0.8" },
  { date: "09-may.", maxTemp: "23.8", minTemp: "15.7", humidity: "70", wind: "15.3", rain: "0.2" },
  { date: "10-may.", maxTemp: "23.5", minTemp: "14.8", humidity: "53", wind: "6.5", rain: "2.0" },
  { date: "11-may.", maxTemp: "22.5", minTemp: "14.1", humidity: "66", wind: "14.4", rain: "1.9" },
  { date: "12-may.", maxTemp: "24.1", minTemp: "12.9", humidity: "54", wind: "14.6", rain: "1.5" },
  { date: "13-may.", maxTemp: "22.1", minTemp: "12.8", humidity: "72", wind: "10.4", rain: "1.6" }
];
