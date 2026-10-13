// Generated from brand/tools (logo construction). Do not edit by hand:
// run `python3 brand/tools/build.py` to regenerate after changing the geometry.

export type LogoRole = string;

export interface LogoShape {
  width: number;
  height: number;
  paths: ReadonlyArray<{ role: LogoRole; d: string }>;
}

export interface LogoDirection {
  name: string;
  compact: LogoShape;
  symbol: LogoShape;
  palettes: { light: Record<LogoRole, string>; dark: Record<LogoRole, string> };
}

export const logoDirections = {
  "signature": {
    "name": "KOVALI Signature",
    "compact": {
      "width": 638,
      "height": 120,
      "paths": [
        {
          "role": "stem",
          "d": "M0 1.8 L25.52 1.8 L25.52 117.8 L0 117.8 Z"
        },
        {
          "role": "arm1",
          "d": "M81.79 1.8 L116 1.8 L67.85 55.74 L33.64 55.74 Z"
        },
        {
          "role": "arm2",
          "d": "M67.85 63.86 L116 117.8 L81.79 117.8 L33.64 63.86 Z"
        },
        {
          "role": "word",
          "d": "M162.4 9.8 L176.4 9.8 L176.4 109.8 L162.4 109.8 Z M213.94 9.8 L230.4 9.8 L192.85 59.8 L230.4 109.8 L213.94 109.8 L176.39 59.8 L176.39 59.8 Z M298 8.2 A51.6 51.6 0 1 1 298 111.4 A51.6 51.6 0 1 1 298 8.2 Z M298 23.18 A36.62 36.62 0 1 0 298 96.42 A36.62 36.62 0 1 0 298 23.18 Z M364.6 9.8 L378.62 9.8 L407.6 88.83 L436.58 9.8 L450.6 9.8 L413.49 111 L401.71 111 Z M478.29 8.6 L490.07 8.6 L527.18 109.8 L513.16 109.8 L484.18 30.77 L455.2 109.8 L441.18 109.8 Z M461.76 72.8 L506.6 72.8 L511.02 84.84 L457.34 84.84 Z M551.18 9.8 L565.18 9.8 L565.18 96.92 L601.18 96.92 L601.18 109.8 L551.18 109.8 Z M623.18 9.8 L637.18 9.8 L637.18 109.8 L623.18 109.8 Z"
        }
      ]
    },
    "symbol": {
      "width": 100,
      "height": 100,
      "paths": [
        {
          "role": "stem",
          "d": "M0 0 L22 0 L22 100 L0 100 Z"
        },
        {
          "role": "arm1",
          "d": "M70.51 0 L100 0 L58.49 46.5 L29 46.5 Z"
        },
        {
          "role": "arm2",
          "d": "M58.49 53.5 L100 100 L70.51 100 L29 53.5 Z"
        }
      ]
    },
    "palettes": {
      "light": {
        "stem": "#0B1733",
        "arm1": "#145BCE",
        "arm2": "#35A9FF",
        "word": "#0B1733",
        "desc": "#145BCE"
      },
      "dark": {
        "stem": "#FFFFFF",
        "arm1": "#35A9FF",
        "arm2": "#1F7BEA",
        "word": "#FFFFFF",
        "desc": "#8FC9FF"
      }
    }
  },
  "tech": {
    "name": "KOVALI Tech",
    "compact": {
      "width": 676,
      "height": 120,
      "paths": [
        {
          "role": "f1",
          "d": "M20.88 1.8 H29 V117.8 H20.88 A20.88 20.88 0 0 1 0 96.92 V22.68 A20.88 20.88 0 0 1 20.88 1.8 Z"
        },
        {
          "role": "f2",
          "d": "M37.12 1.8 L109.55 1.8 L37.12 60.5 Z"
        },
        {
          "role": "f3",
          "d": "M50.88 59.8 L116 7.03 L116 112.57 Z"
        },
        {
          "role": "f4",
          "d": "M37.12 59.1 L109.55 117.8 L37.12 117.8 Z"
        },
        {
          "role": "word",
          "d": "M162.4 9.8 L172.4 9.8 L172.4 109.8 L162.4 109.8 Z M222.9 9.8 L236.4 9.8 L185.89 59.8 L236.4 109.8 L222.9 109.8 L172.39 59.8 L172.39 59.8 Z M290.16 9.2 H326.64 A29.76 29.76 0 0 1 356.4 38.96 V80.64 A29.76 29.76 0 0 1 326.64 110.4 H290.16 A29.76 29.76 0 0 1 260.4 80.64 V38.96 A29.76 29.76 0 0 1 290.16 9.2 Z M290.16 19.7 A19.26 19.26 0 0 0 270.9 38.96 V80.64 A19.26 19.26 0 0 0 290.16 99.9 H326.64 A19.26 19.26 0 0 0 345.9 80.64 V38.96 A19.26 19.26 0 0 0 326.64 19.7 Z M378.4 9.8 L388.86 9.8 L424.4 87.07 L459.94 9.8 L470.4 9.8 L424.4 109.8 L424.4 109.8 Z M499.02 9.8 L499.02 9.8 L545.02 109.8 L534.56 109.8 L499.02 32.53 L463.48 109.8 L453.02 109.8 Z M575.02 9.8 L585.02 9.8 L585.02 99.8 L635.02 99.8 L635.02 109.8 L575.02 109.8 Z M665.02 9.8 L675.02 9.8 L675.02 109.8 L665.02 109.8 Z"
        }
      ]
    },
    "symbol": {
      "width": 100,
      "height": 100,
      "paths": [
        {
          "role": "f1",
          "d": "M18 0 H25 V100 H18 A18 18 0 0 1 0 82 V18 A18 18 0 0 1 18 0 Z"
        },
        {
          "role": "f2",
          "d": "M32 0 L94.44 0 L32 50.6 Z"
        },
        {
          "role": "f3",
          "d": "M43.86 50 L100 4.5 L100 95.5 Z"
        },
        {
          "role": "f4",
          "d": "M32 49.4 L94.44 100 L32 100 Z"
        }
      ]
    },
    "palettes": {
      "light": {
        "f1": "#0B1733",
        "f2": "#145BCE",
        "f3": "#35A9FF",
        "f4": "#145BCE",
        "word": "#0B1733",
        "desc": "#145BCE"
      },
      "dark": {
        "f1": "#FFFFFF",
        "f2": "#2C74E0",
        "f3": "#35A9FF",
        "f4": "#2C74E0",
        "word": "#FFFFFF",
        "desc": "#8FC9FF"
      }
    }
  },
  "minimal": {
    "name": "KOVALI Minimal",
    "compact": {
      "width": 520,
      "height": 104,
      "paths": [
        {
          "role": "word",
          "d": "M0 1.8 L7.5 1.8 L7.5 101.8 L0 101.8 Z M55.76 1.8 L66 1.8 L24.62 51.8 L14.38 51.8 Z M24.62 51.8 L66 101.8 L55.76 101.8 L14.38 51.8 Z  M147.4 0.4 A51.4 51.4 0 1 1 147.4 103.2 A51.4 51.4 0 1 1 147.4 0.4 Z M147.4 8.35 A43.45 43.45 0 1 0 147.4 95.25 A43.45 43.45 0 1 0 147.4 8.35 Z M226.8 1.8 L234.46 1.8 L268.8 89.17 L303.14 1.8 L310.8 1.8 L271.1 102.8 L266.5 102.8 Z M347.33 0.8 L351.93 0.8 L391.63 101.8 L383.97 101.8 L349.63 14.43 L315.29 101.8 L307.63 101.8 Z M325.61 65.8 L373.65 65.8 L376.3 72.55 L322.96 72.55 Z M427.63 1.8 L435.13 1.8 L435.13 94.67 L477.63 94.67 L477.63 101.8 L427.63 101.8 Z M511.63 1.8 L519.13 1.8 L519.13 101.8 L511.63 101.8 Z"
        },
        {
          "role": "node",
          "d": "M13 45.3 L26 45.3 L26 58.3 L13 58.3 Z"
        }
      ]
    },
    "symbol": {
      "width": 100,
      "height": 100,
      "paths": [
        {
          "role": "stroke",
          "d": "M0 0 L11 0 L11 100 L0 100 Z M81.16 0 L100 0 L39.92 50 L21.08 50 Z M39.92 50 L100 100 L81.16 100 L21.08 50 Z"
        },
        {
          "role": "node",
          "d": "M19 38.5 L42 38.5 L42 61.5 L19 61.5 Z"
        }
      ]
    },
    "palettes": {
      "light": {
        "stroke": "#0B1733",
        "node": "#35A9FF",
        "word": "#0B1733",
        "desc": "#4A5878"
      },
      "dark": {
        "stroke": "#FFFFFF",
        "node": "#35A9FF",
        "word": "#FFFFFF",
        "desc": "#AFC0DA"
      }
    }
  }
} as const satisfies Record<string, LogoDirection>;

export type LogoDirectionKey = keyof typeof logoDirections;
