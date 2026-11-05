// Reference data for prosthetic mitral valves (type + size -> expected
// normal Doppler values), transcribed from:
//   Zoghbi WA et al., "Guidelines for the Evaluation of Prosthetic Valve
//   Function With Cardiovascular Imaging," J Am Soc Echocardiogr
//   2024;37:2-63. Appendix Table A5 (surgical, pages 58-61, itself
//   "modified from Rosenhek et al.") and Table A6 (SAPIEN valves placed
//   percutaneously in the mitral position, page 61).
//
// Lazy-loaded the same way as aortic-valves.js — only when prosthetic-MV
// mode is turned on or its picker is opened (see loadProstheticValveData()
// in app.js). Registers into window.prostheticMitralValves.
//
// Each entry: { name, category: "mechanical"|"biological", transcatheter?,
// inferred?, sizes: [{ size, peak?, mean?, vel?, pht?, eoa? }] }.
// peak = peak gradient (mmHg), mean = mean gradient (mmHg), vel = peak
// velocity (m/s), pht = pressure half-time (ms), eoa = effective orifice
// area (cm²) — "mean ± SD" strings exactly as printed; a value with no
// "± SD" is printed that way in the source (single study, no SD). A missing
// key means that column was blank for that row in the source, not zero.
// Table A5 has no DVI column, unlike the aortic tables.
//
// Every row was checked against the rendered PDF pages (not only text
// extraction, which misaligns some columns and prints "±" as "6").
//
// `inferred: true` marks a valve whose mechanical/biological category is
// NOT printed in the source table (the table gives a type line such as
// "Bileaflet" or "Stented bioprosthesis" under most names, but not these):
// Abbott Epic, Edwards Mitris, Medtronic Mosaic — all porcine/pericardial
// bioprostheses by their established classification.
//
// Source-data quirk, kept as printed: Medtronic Mosaic's five rows (25-33)
// are digit-for-digit identical to Hancock II's in Table A5 — very likely a
// copy error in the guideline itself (both are Medtronic porcine valves),
// but there's no other value to substitute, so both are reproduced as is.
//
// SAPIEN (Table A6): only mean gradients exist, split by procedure type
// (valve-in-valve, valve-in-ring, valve-in-mitral-annular-calcification);
// per-size values are the Eleid et al. rows. Modeled as three separate
// "valves" so the existing name -> size picker works unchanged. ViMAC 23 and
// 26 mm are single values with no SD in the source ("limited data").

window.prostheticMitralValves = [
  // ---- Mechanical (Table A5) ----
  { name: "Bjork-Shiley", category: "mechanical", sizes: [
    { size: "23", vel: "1.7", pht: "115" },
    { size: "25", peak: "12 ± 4", mean: "6 ± 2", vel: "1.75 ± 0.38", pht: "99 ± 27", eoa: "1.72 ± 0.6" },
    { size: "27", peak: "10 ± 4", mean: "5 ± 2", vel: "1.6 ± 0.49", pht: "89 ± 28", eoa: "1.81 ± 0.54" },
    { size: "29", peak: "7.83 ± 2.93", mean: "2.83 ± 1.27", vel: "1.37 ± 0.25", pht: "79 ± 17", eoa: "2.1 ± 0.43" },
    { size: "31", peak: "6 ± 3", mean: "2 ± 1.9", vel: "1.41 ± 0.26", pht: "70 ± 14", eoa: "2.2 ± 0.3" },
  ]},
  { name: "Bjork-Shiley monostrut", category: "mechanical", sizes: [
    { size: "23", mean: "5.0", vel: "1.9" },
    { size: "25", peak: "13 ± 2.5", mean: "5.57 ± 2.3", vel: "1.8 ± 0.3" },
    { size: "27", peak: "12 ± 2.5", mean: "4.53 ± 2.2", vel: "1.7 ± 0.4" },
    { size: "29", peak: "13 ± 3", mean: "4.26 ± 1.6", vel: "1.6 ± 0.3" },
    { size: "31", peak: "14 ± 4.5", mean: "4.9 ± 1.6", vel: "1.7 ± 0.3" },
  ]},
  { name: "Carbomedics", category: "mechanical", sizes: [
    { size: "23", vel: "1.9 ± 0.1", pht: "126 ± 7" },
    { size: "25", peak: "10.3 ± 2.3", mean: "3.6 ± 0.6", vel: "1.3 ± 0.1", pht: "93 ± 8", eoa: "2.9 ± 0.8" },
    { size: "27", peak: "8.79 ± 3.46", mean: "3.46 ± 1.03", vel: "1.61 ± 0.3", pht: "89 ± 20", eoa: "2.9 ± 0.75" },
    { size: "29", peak: "8.78 ± 2.9", mean: "3.39 ± 0.97", vel: "1.52 ± 0.3", pht: "88 ± 17", eoa: "2.3 ± 0.4" },
    { size: "31", peak: "8.87 ± 2.34", mean: "3.32 ± 0.87", vel: "1.61 ± 0.29", pht: "92 ± 24", eoa: "2.8 ± 1.14" },
    { size: "33", peak: "8.8 ± 2.2", mean: "4.8 ± 2.5", vel: "1.5 ± 0.2", pht: "93 ± 12" },
  ]},
  { name: "Duromedics", category: "mechanical", sizes: [
    { size: "27", peak: "13 ± 6", mean: "5 ± 3", vel: "1.61 ± 0.4", pht: "75 ± 12" },
    { size: "29", peak: "10 ± 4", mean: "3 ± 1", vel: "1.40 ± 0.25", pht: "85 ± 22" },
    { size: "31", peak: "10.5 ± 4.33", mean: "3.3 ± 1.36", vel: "1.38 ± 0.27", pht: "81 ± 12" },
    { size: "33", peak: "11.2", mean: "2.5", pht: "85" },
  ]},
  { name: "Lillehei-Kaster", category: "mechanical", sizes: [
    { size: "18", vel: "1.7", pht: "140" },
    { size: "20", vel: "1.7", pht: "67" },
    { size: "22", vel: "1.56 ± 0.09", pht: "94 ± 22" },
    { size: "25", vel: "1.38 ± 0.27", pht: "124 ± 46" },
  ]},
  { name: "Medtronic-Hall", category: "mechanical", sizes: [
    { size: "27", vel: "1.4", pht: "78" },
    { size: "29", vel: "1.57 ± 0.1", pht: "69 ± 15" },
    { size: "31", vel: "1.45 ± 0.12", pht: "77 ± 17" },
  ]},
  { name: "Omnicarbon", category: "mechanical", sizes: [
    { size: "23", mean: "8.0" },
    { size: "25", mean: "6.05 ± 1.81", vel: "1.77 ± 0.24", pht: "102 ± 16" },
    { size: "27", mean: "4.89 ± 2.05", vel: "1.63 ± 0.36", pht: "105 ± 33" },
    { size: "29", mean: "4.93 ± 2.16", vel: "1.56 ± 0.27", pht: "120 ± 40" },
    { size: "31", mean: "4.18 ± 1.4", vel: "1.3 ± 0.23", pht: "134 ± 31" },
    { size: "33", mean: "4 ± 2" },
  ]},
  { name: "On-X", category: "mechanical", sizes: [
    { size: "25", peak: "11.5 ± 3.2", mean: "5.3 ± 2.1", eoa: "1.9 ± 1.1" },
    { size: "27-29", peak: "10.3 ± 4.5", mean: "4.5 ± 1.6", eoa: "2.2 ± 0.5" },
    { size: "31-33", peak: "9.8 ± 3.8", mean: "4.8 ± 2.4", eoa: "2.5 ± 1.1" },
  ]},
  { name: "Sorin Allcarbon", category: "mechanical", sizes: [
    { size: "25", peak: "15 ± 3", mean: "5 ± 1", vel: "2 ± 0.2", pht: "105 ± 29", eoa: "2.2 ± 0.6" },
    { size: "27", peak: "13 ± 2", mean: "4 ± 1", vel: "1.8 ± 0.1", pht: "89 ± 14", eoa: "2.5 ± 0.5" },
    { size: "29", peak: "10 ± 2", mean: "4 ± 1", vel: "1.6 ± 0.2", pht: "85 ± 23", eoa: "2.8 ± 0.7" },
    { size: "31", peak: "9 ± 1", mean: "4 ± 1", vel: "1.6 ± 0.1", pht: "88 ± 27", eoa: "2.8 ± 0.9" },
  ]},
  { name: "Sorin Bicarbon", category: "mechanical", sizes: [
    { size: "25", peak: "15 ± 0.25", mean: "4 ± 0.5", vel: "1.95 ± 0.02", pht: "70 ± 1" },
    { size: "27", peak: "11 ± 2.75", mean: "4 ± 0.5", vel: "1.65 ± 0.21", pht: "82 ± 20" },
    { size: "29", peak: "12 ± 3", mean: "4 ± 1.25", vel: "1.73 ± 0.22", pht: "80 ± 14" },
    { size: "31", peak: "10 ± 1.5", mean: "4 ± 1", vel: "1.66 ± 0.11", pht: "83 ± 14" },
  ]},
  { name: "St. Jude Medical", category: "mechanical", sizes: [
    { size: "23", mean: "4.0", vel: "1.5", pht: "160", eoa: "1.0" },
    { size: "25", mean: "2.5 ± 1", vel: "1.34 ± 1.12", pht: "75 ± 4", eoa: "1.35 ± 0.17" },
    { size: "27", peak: "11 ± 4", mean: "5 ± 1.82", vel: "1.61 ± 0.29", pht: "75 ± 10", eoa: "1.67 ± 0.17" },
    { size: "29", peak: "10 ± 3", mean: "4.15 ± 1.8", vel: "1.57 ± 0.29", pht: "85 ± 10", eoa: "1.75 ± 0.24" },
    { size: "31", peak: "12 ± 6", mean: "4.46 ± 2.22", vel: "1.59 ± 0.33", pht: "74 ± 13", eoa: "2.03 ± 0.32" },
  ]},
  { name: "Starr-Edwards", category: "mechanical", sizes: [
    { size: "26", mean: "10.0", eoa: "1.4" },
    { size: "28", mean: "7 ± 2.75", eoa: "1.9 ± 0.57" },
    { size: "30", peak: "12.2 ± 4.6", mean: "6.99 ± 2.5", vel: "1.7 ± 0.3", pht: "125 ± 25", eoa: "1.65 ± 0.4" },
    { size: "32", peak: "11.5 ± 4.2", mean: "5.08 ± 2.5", vel: "1.7 ± 0.3", pht: "110 ± 25", eoa: "1.98 ± 0.4" },
    { size: "34", mean: "5.0", eoa: "2.6" },
  ]},

  // ---- Biological, surgical (Table A5) ----
  { name: "Abbott Epic", category: "biological", inferred: true, sizes: [
    { size: "27", mean: "6.1 ± 2.9", eoa: "1.4 ± 0.7" },
    { size: "29", mean: "5.5 ± 1.7", eoa: "1.5 ± 0.5" },
    { size: "31", mean: "4.8 ± 1.4", eoa: "1.6 ± 0.3" },
    { size: "33", mean: "4.1 ± 1.6", eoa: "1.5 ± 0.3" },
  ]},
  { name: "Biocor (stentless)", category: "biological", sizes: [
    { size: "27", peak: "13 ± 1" },
    { size: "29", peak: "14 ± 2.5" },
    { size: "31", peak: "11.5 ± 0.5" },
    { size: "33", peak: "12 ± 0.5" },
  ]},
  { name: "Bioflo pericardial", category: "biological", sizes: [
    { size: "25", peak: "10 ± 2", mean: "6.3 ± 1.5", eoa: "2 ± 0.1" },
    { size: "27", peak: "9.5 ± 2.6", mean: "5.4 ± 1.2", eoa: "2 ± 0.3" },
    { size: "29", peak: "5 ± 2.8", mean: "3.6 ± 1", eoa: "2.4 ± 0.2" },
    { size: "31", peak: "4.0", mean: "2.0", eoa: "2.3" },
  ]},
  { name: "Carpentier-Edwards", category: "biological", sizes: [
    { size: "27", mean: "6 ± 2", vel: "1.7 ± 0.3", pht: "98 ± 28" },
    { size: "29", mean: "4.7 ± 2", vel: "1.76 ± 0.27", pht: "92 ± 14" },
    { size: "31", mean: "4.4 ± 2", vel: "1.54 ± 0.15", pht: "92 ± 19" },
    { size: "33", mean: "6 ± 3", pht: "93 ± 12" },
  ]},
  { name: "Carpentier-Edwards pericardial", category: "biological", sizes: [
    { size: "27", mean: "3.6", vel: "1.6", pht: "100" },
    { size: "29", mean: "5.25 ± 2.36", vel: "1.67 ± 0.3", pht: "110 ± 15" },
    { size: "31", mean: "4.05 ± 0.83", vel: "1.53 ± 0.1", pht: "90 ± 11" },
    { size: "33", mean: "1.0", vel: "0.8", pht: "80" },
  ]},
  { name: "Carpentier-Edwards Perimount", category: "biological", sizes: [
    { size: "25", mean: "4.0 ± 1.0", vel: "1.7 ± 0.10", pht: "67 ± 21.5", eoa: "1.75 ± 0.53" },
    { size: "27", mean: "6.3 ± 1.65", vel: "1.7 ± 0.27", pht: "74 ± 20.6", eoa: "1.88 ± 0.52" },
    { size: "29", mean: "6.0 ± 1.41", vel: "1.8 ± 0.19", pht: "76 ± 17.9", eoa: "2.02 ± 0.57" },
    { size: "31", mean: "5.5 ± 1.06", vel: "1.8 ± 0.20", pht: "80 ± 21.8", eoa: "2.09 ± 0.48" },
    { size: "33", mean: "6.1 ± 1.86", vel: "1.7 ± 0.23", pht: "77 ± 13.2", eoa: "2.24 ± 0.97" },
  ]},
  { name: "Edwards Mitris", category: "biological", inferred: true, sizes: [
    { size: "25", mean: "4.9 ± 1.2", eoa: "1.1 ± 0.4" },
    { size: "27", mean: "4.1 ± 1.4", eoa: "1.2 ± 0.3" },
    { size: "29", mean: "4.1 ± 1.5", eoa: "1.5 ± 0.6" },
    { size: "31", mean: "3.9 ± 2.0", eoa: "1.4 ± 0.5" },
    { size: "33", mean: "3.3 ± 1.4", eoa: "1.5 ± 0.7" },
  ]},
  { name: "Hancock I or not specified", category: "biological", sizes: [
    { size: "27", peak: "10 ± 4", mean: "5 ± 2", eoa: "1.3 ± 0.8" },
    { size: "29", peak: "7 ± 3", mean: "2.46 ± 0.79", pht: "115 ± 20", eoa: "1.5 ± 0.2" },
    { size: "31", peak: "4 ± 0.86", mean: "4.86 ± 1.69", pht: "95 ± 17", eoa: "1.6 ± 0.2" },
    { size: "33", peak: "3 ± 2", mean: "3.87 ± 2", pht: "90 ± 12", eoa: "1.9 ± 0.2" },
  ]},
  { name: "Hancock II", category: "biological", sizes: [
    { size: "25", mean: "8.3 ± 1.71", vel: "2.1 ± 0.28", pht: "76 ± 19.8", eoa: "1.42 ± 0.29" },
    { size: "27", mean: "6.1 ± 1.33", vel: "2 ± 0.28", pht: "81 ± 18.9", eoa: "1.62 ± 0.47" },
    { size: "29", mean: "6.7 ± 2.20", vel: "2.0 ± 0.31", pht: "77 ± 15.1", eoa: "1.83 ± 0.68" },
    { size: "31", mean: "6.0 ± 1.58", vel: "2.0 ± 0.32", pht: "76 ± 12.1", eoa: "1.70 ± 0.41" },
    { size: "33", mean: "5.5 ± 1.64", vel: "1.9 ± 0.50", pht: "65 ± 8.7", eoa: "2.71 ± 0.77" },
  ]},
  { name: "Hancock pericardial", category: "biological", sizes: [
    { size: "29", mean: "2.61 ± 1.39", vel: "1.42 ± 0.14", pht: "105 ± 36" },
    { size: "31", mean: "3.57 ± 1.02", vel: "1.51 ± 0.27", pht: "81 ± 23" },
  ]},
  { name: "Ionescu-Shiley", category: "biological", sizes: [
    { size: "25", mean: "4.87 ± 1.08", vel: "1.43 ± 0.15", pht: "93 ± 11" },
    { size: "27", mean: "3.21 ± 0.82", vel: "1.31 ± 0.24", pht: "100 ± 28" },
    { size: "29", mean: "3.22 ± 0.57", vel: "1.38 ± 0.2", pht: "85 ± 8" },
    { size: "31", mean: "3.63 ± 0.9", vel: "1.45 ± 0.06", pht: "100 ± 36" },
  ]},
  { name: "Ionescu-Shiley low profile", category: "biological", sizes: [
    { size: "29", mean: "3.31 ± 0.96", vel: "1.36 ± 0.25", pht: "80 ± 30" },
    { size: "31", mean: "2.74 ± 0.37", vel: "1.33 ± 0.14", pht: "79 ± 15" },
  ]},
  { name: "Labcor-Santiago pericardial", category: "biological", sizes: [
    { size: "25", peak: "8.7", mean: "4.5", pht: "97", eoa: "2.2" },
    { size: "27", peak: "5.6 ± 2.3", mean: "2.8 ± 1.5", pht: "85 ± 18", eoa: "2.12 ± 0.48" },
    { size: "29", peak: "6.2 ± 2.1", mean: "3 ± 1.3", pht: "80 ± 34", eoa: "2.11 ± 0.73" },
  ]},
  { name: "Medtronic Intact Porcine", category: "biological", sizes: [
    { size: "29", mean: "3.5 ± 0.51", vel: "1.6 ± 0.22" },
    { size: "31", mean: "4.2 ± 1.44", vel: "1.6 ± 0.26" },
    { size: "33", mean: "4 ± 1.3", vel: "1.4 ± 0.24" },
    { size: "35", mean: "3.2 ± 1.77", vel: "1.3 ± 0.5" },
  ]},
  // Identical to Hancock II in the source — see the header comment.
  { name: "Medtronic Mosaic", category: "biological", inferred: true, sizes: [
    { size: "25", mean: "8.3 ± 1.71", vel: "2.1 ± 0.28", pht: "76 ± 19.8", eoa: "1.42 ± 0.29" },
    { size: "27", mean: "6.1 ± 1.33", vel: "2 ± 0.28", pht: "81 ± 18.9", eoa: "1.62 ± 0.47" },
    { size: "29", mean: "6.7 ± 2.20", vel: "2.0 ± 0.31", pht: "77 ± 15.1", eoa: "1.83 ± 0.68" },
    { size: "31", mean: "6.0 ± 1.58", vel: "2.0 ± 0.32", pht: "76 ± 12.1", eoa: "1.70 ± 0.41" },
    { size: "33", mean: "5.5 ± 1.64", vel: "1.9 ± 0.50", pht: "65 ± 8.7", eoa: "2.71 ± 0.77" },
  ]},
  { name: "Mitroflow", category: "biological", sizes: [
    { size: "25", mean: "6.9", vel: "2.0", pht: "90" },
    { size: "27", mean: "3.07 ± 0.91", vel: "1.5", pht: "90 ± 20" },
    { size: "29", mean: "3.5 ± 1.65", vel: "1.43 ± 0.29", pht: "102 ± 21" },
    { size: "31", mean: "3.85 ± 0.81", vel: "1.32 ± 0.26", pht: "91 ± 22" },
  ]},
  { name: "Stentless quadrileaflet bovine pericardial", category: "biological", sizes: [
    { size: "26", mean: "2.2 ± 1.7", vel: "1.6", pht: "103 ± 31", eoa: "1.7" },
    { size: "28", vel: "1.58 ± 0.25", eoa: "1.7 ± 0.6" },
    { size: "30", vel: "1.42 ± 0.32", eoa: "2.3 ± 0.4" },
  ]},
  { name: "Wessex", category: "biological", sizes: [
    { size: "29", mean: "3.69 ± 0.61", vel: "1.66 ± 0.17", pht: "83 ± 19" },
    { size: "31", mean: "3.31 ± 0.83", vel: "1.41 ± 0.25", pht: "80 ± 21" },
  ]},

  // ---- Transcatheter, mitral position (Table A6, Eleid et al. rows) ----
  { name: "SAPIEN — valve-in-valve (ViV)", category: "biological", transcatheter: true, sizes: [
    { size: "23", mean: "6.4 ± 2.4" },
    { size: "26", mean: "7.0 ± 2.6" },
    { size: "29", mean: "4.9 ± 2.1" },
  ]},
  { name: "SAPIEN — valve-in-ring (ViR)", category: "biological", transcatheter: true, sizes: [
    { size: "23", mean: "5 ± 2" },
    { size: "26", mean: "6 ± 1.4" },
    { size: "29", mean: "6 ± 3" },
  ]},
  { name: "SAPIEN — valve-in-MAC (ViMAC)", category: "biological", transcatheter: true, sizes: [
    { size: "23", mean: "8" },
    { size: "26", mean: "4" },
    { size: "29", mean: "2.5 ± 0.5" },
  ]},
];
