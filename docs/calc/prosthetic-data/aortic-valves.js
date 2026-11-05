// Reference data for prosthetic aortic valves (type + size -> expected
// normal Doppler values), transcribed from:
//   Zoghbi WA et al., "Guidelines for the Evaluation of Prosthetic Valve
//   Function With Cardiovascular Imaging," J Am Soc Echocardiogr
//   2024;37:2-63. Appendix Tables A1-A4 (transcatheter: A1-A3, pages
//   51-52; surgical: A4, pages 53-58).
//
// Lazy-loaded (like wiki-topics/<id>.js) only when the user opens the
// valve type/size picker or turns on prosthetic-AV mode — this data isn't
// needed for the calculator's core function, so it shouldn't cost anything
// for someone who never uses it. Registers into
// window.prostheticAorticValves; see loadProstheticAorticValves() in
// app.js.
//
// Each entry: { name, thirdParty?, category: "mechanical"|"biological", transcatheter?,
// viv?, inferred?, sizes: [{ size, peak?, mean?, eoa?, dvi? }] }.
// peak/mean/eoa/dvi are the "mean ± SD" strings exactly as printed in the
// source table (peak = peak gradient mmHg, mean = mean gradient mmHg,
// eoa = effective orifice area cm², dvi = Doppler velocity index) — a
// missing key means that column was blank for that row in the source, not
// zero. `size` is the mm label as printed (some are ranges, e.g. "19-21",
// or a lettered bracket for Sorin Perceval, e.g. "S (21)").
//
// `inferred: true` marks a valve whose mechanical/biological category is
// NOT an explicit label in the source table (the table only labels the
// first model in a manufacturer group in some cases, or omits it for a
// well-known product name) — these are filled in from the valve's
// established clinical classification instead. Double-check any of these
// against the source table (or another reference) if something looks off:
// Abbott Epic, Abbott Trifecta, Arbor Surgical Trilogy, ATS 3F Enable
// (biological — despite sitting right next to ATS's mechanical Bileaflet/
// AP models under the same manufacturer heading), Carbomedics Tophat,
// Edwards Inspiris Resilia, Edwards Intuity, Edwards Mosaic, Medtronic
// Avalus, Medtronic Mosaic, Prima, Sorin Perceval Sutureless.

window.prostheticAorticValves = [
  // ---- Transcatheter (Table A1-A2, native aortic stenosis) ----
  { name: "SAPIEN", category: "biological", transcatheter: true, sizes: [
    { size: "23", mean: "9.92 ± 4.27", eoa: "1.56 ± 0.43", dvi: "0.53 ± 0.13" },
    { size: "26", mean: "8.76 ± 3.89", eoa: "1.84 ± 0.52", dvi: "0.53 ± 0.13" },
  ]},
  { name: "SAPIEN XT", category: "biological", transcatheter: true, sizes: [
    { size: "23", mean: "10.41 ± 3.74", eoa: "1.41 ± 0.30", dvi: "0.52 ± 0.10" },
    { size: "26", mean: "9.24 ± 3.57", eoa: "1.74 ± 0.42", dvi: "0.54 ± 0.11" },
    { size: "29", mean: "8.36 ± 3.14", eoa: "2.06 ± 0.52", dvi: "0.53 ± 0.11" },
  ]},
  { name: "SAPIEN 3", category: "biological", transcatheter: true, sizes: [
    { size: "20", mean: "16.23 ± 5.01", eoa: "1.22 ± 0.22", dvi: "0.42 ± 0.07" },
    { size: "23", mean: "12.79 ± 4.65", eoa: "1.45 ± 0.26", dvi: "0.43 ± 0.08" },
    { size: "26", mean: "10.59 ± 3.88", eoa: "1.74 ± 0.35", dvi: "0.43 ± 0.09" },
    { size: "29", mean: "9.28 ± 3.16", eoa: "1.89 ± 0.37", dvi: "0.40 ± 0.09" },
  ]},
  { name: "CoreValve", category: "biological", transcatheter: true, sizes: [
    { size: "23", mean: "14.43 ± 5.72", eoa: "1.12 ± 0.36", dvi: "0.44 ± 0.09" },
    { size: "26", mean: "8.27 ± 3.82", eoa: "1.74 ± 0.49", dvi: "0.59 ± 0.15" },
    { size: "29", mean: "8.85 ± 4.17", eoa: "1.97 ± 0.53", dvi: "0.54 ± 0.12" },
    { size: "31", mean: "9.55 ± 3.44", eoa: "2.15 ± 0.72", dvi: "0.49 ± 0.12" },
  ]},
  { name: "Evolut R", category: "biological", transcatheter: true, sizes: [
    { size: "23", mean: "14.97 ± 7.15", eoa: "1.09 ± 0.26", dvi: "0.42 ± 0.04" },
    { size: "26", mean: "7.53 ± 2.65", eoa: "1.69 ± 0.40", dvi: "0.61 ± 0.13" },
    { size: "29", mean: "7.85 ± 3.08", eoa: "1.97 ± 0.54", dvi: "0.59 ± 0.14" },
    { size: "34", mean: "6.30 ± 3.23", eoa: "2.60 ± 0.75", dvi: "0.58 ± 0.15" },
  ]},
  // ---- Transcatheter valve-in-valve (Table A3, 1 year post-procedure) ----
  { name: "CoreValve (valve-in-valve)", category: "biological", transcatheter: true, viv: true, sizes: [
    { size: "All", peak: "23.48 ± 12.10", mean: "12.89 ± 0.20", eoa: "1.62 ± 0.14" },
  ]},
  { name: "Evolut (valve-in-valve)", category: "biological", transcatheter: true, viv: true, sizes: [
    { size: "All", peak: "22.43 ± 5.72", mean: "14.70 ± 9.11", eoa: "1.36 ± 0.07" },
  ]},
  { name: "SAPIEN 3 (valve-in-valve)", category: "biological", transcatheter: true, viv: true, sizes: [
    { size: "All", peak: "33.93 ± 10.11", mean: "27.00 ± 10.20", eoa: "1.07 ± 0.32" },
  ]},
  { name: "SAPIEN XT (valve-in-valve)", category: "biological", transcatheter: true, viv: true, sizes: [
    { size: "All", peak: "31.31 ± 3.75", mean: "18.02 ± 4.22", eoa: "1.31 ± 0.25" },
  ]},

  // ---- Surgical (Table A4) ----
  { name: "Abbott Epic", category: "biological", inferred: true, sizes: [
    { size: "21", mean: "19.1 ± 8.2", eoa: "1.0 ± 0.3" },
    { size: "23", mean: "13.9 ± 6.0", eoa: "1.4 ± 0.5" },
    { size: "25", mean: "12.1 ± 5.1", eoa: "1.5 ± 0.5" },
    { size: "27", mean: "11.4 ± 4.1", eoa: "1.6 ± 0.4" },
    { size: "29", mean: "7.5 ± 3.3", eoa: "2.4 ± 1.1" },
  ]},
  { name: "Abbott Trifecta", category: "biological", inferred: true, sizes: [
    { size: "19", mean: "10.7 ± 4.6", eoa: "1.41 ± 0.24" },
    { size: "21", mean: "8.1 ± 3.5", eoa: "1.63 ± 0.29" },
    { size: "23", mean: "7.2 ± 2.8", eoa: "1.81 ± 0.30" },
    { size: "25", mean: "6.2 ± 2.7", eoa: "2.02 ± 0.32" },
    { size: "27", mean: "4.8 ± 2.0", eoa: "2.20 ± 0.20" },
    { size: "29", mean: "4.7 ± 1.6", eoa: "2.35 ± 0.22" },
  ]},
  { name: "Arbor Surgical Trilogy", category: "biological", inferred: true, sizes: [
    { size: "21", peak: "21 ± 8", mean: "11 ± 6", eoa: "1.9 ± 0.2" },
    { size: "23", peak: "15 ± 7", mean: "8 ± 4", eoa: "2.0 ± 0.3" },
  ]},
  { name: "ATS Bileaflet", category: "mechanical", sizes: [
    { size: "19", peak: "47.0 ± 12.6", mean: "25.3 ± 8.0", eoa: "1.1 ± 0.3" },
    { size: "21", peak: "23.7 ± 6.8", mean: "15.9 ± 5.0", eoa: "1.4 ± 0.5" },
    { size: "23", mean: "14.4 ± 4.9", eoa: "1.7 ± 0.5" },
    { size: "25", mean: "11.3 ± 3.7", eoa: "2.1 ± 0.7" },
    { size: "27", mean: "8.4 ± 3.7", eoa: "2.5 ± 0.1" },
    { size: "29", mean: "8.0 ± 3.0", eoa: "3.1 ± 0.8" },
  ]},
  { name: "ATS AP Bileaflet", category: "mechanical", sizes: [
    { size: "18", mean: "21.0 ± 1.8", eoa: "1.2 ± 0.3" },
    { size: "20", peak: "21.4 ± 4.2", mean: "11.1 ± 3.5", eoa: "1.3 ± 0.3" },
    { size: "22", peak: "18.7 ± 8.3", mean: "10.5 ± 4.5", eoa: "1.7 ± 0.4" },
    { size: "24", peak: "15.1 ± 5.6", mean: "7.5 ± 3.1", eoa: "2.0 ± 0.6" },
    { size: "26", mean: "6.0 ± 2.0", eoa: "2.1 ± 0.4" },
  ]},
  { name: "ATS 3F Enable", category: "biological", inferred: true, sizes: [
    { size: "21", peak: "27.0 ± 8.4", mean: "15.0 ± 4.6", eoa: "1.1 ± 0.4" },
    { size: "22", peak: "25.7 ± 10.8", mean: "14.5 ± 6.0", eoa: "1.4 ± 0.4" },
    { size: "25", peak: "20.3 ± 7.4", mean: "11.4 ± 4.0", eoa: "1.6 ± 0.5" },
    { size: "27", peak: "16.8 ± 6.3", mean: "9.4 ± 3.3", eoa: "1.9 ± 0.5" },
    { size: "29", peak: "14.3 ± 6.7", mean: "7.8 ± 3.8", eoa: "2.4 ± 0.8" },
  ]},
  { name: "Baxter Perimount", category: "biological", sizes: [
    { size: "19", peak: "32.5 ± 8.5", mean: "19.5 ± 5.5", eoa: "1.3 ± 0.2" },
    { size: "21", peak: "24.9 ± 7.7", mean: "13.8 ± 4.0", eoa: "1.3 ± 0.3" },
    { size: "23", peak: "19.9 ± 7.4", mean: "11.5 ± 3.9", eoa: "1.6 ± 0.3" },
    { size: "25", peak: "16.5 ± 7.8", mean: "10.7 ± 3.8", eoa: "1.6 ± 0.4" },
    { size: "27", peak: "12.8 ± 5.4", mean: "4.8 ± 2.2", eoa: "2.0 ± 0.4" },
  ]},
  { name: "Biocor", category: "biological", sizes: [
    { size: "23", peak: "30.0 ± 10.7", mean: "20 ± 6.6", eoa: "1.3 ± 0.3" },
    { size: "25", peak: "23.0 ± 7.9", mean: "16 ± 5.1", eoa: "1.7 ± 0.4" },
    { size: "27", peak: "22.0 ± 6.5", mean: "15.0 ± 3.7", eoa: "2.2 ± 0.4" },
  ]},
  { name: "Extended Biocor", category: "biological", sizes: [
    { size: "19-21", peak: "17.5 ± 6.5", mean: "9.6 ± 3.6", eoa: "1.4 ± 0.4" },
    { size: "23", peak: "14.7 ± 7.3", mean: "7.7 ± 3.8", eoa: "1.7 ± 0.4" },
    { size: "25", peak: "14.0 ± 4.3", mean: "7.4 ± 2.5", eoa: "1.8 ± 0.4" },
  ]},
  { name: "Bioflo", category: "biological", sizes: [
    { size: "19", peak: "37.2 ± 8.8", mean: "26.4 ± 5.5", eoa: "0.7 ± 0.1" },
    { size: "21", peak: "28.7 ± 6.2", mean: "18.7 ± 5.5", eoa: "1.1 ± 0.1" },
  ]},
  { name: "Bjork-Shiley", category: "mechanical", sizes: [
    { size: "21", peak: "38.9 ± 11.9", mean: "21.8 ± 3.4", eoa: "1.1 ± 0.3" },
    { size: "23", peak: "28.8 ± 11.2", mean: "15.7 ± 5.3", eoa: "1.3 ± 0.3" },
    { size: "25", peak: "23.7 ± 8.2", mean: "13.0 ± 5.0", eoa: "1.5 ± 0.4" },
    { size: "27", mean: "10.0 ± 2.0", eoa: "1.6 ± 0.3" },
  ]},
  { name: "Carbomedics reduced", category: "mechanical", sizes: [
    { size: "19", peak: "43.4 ± 1.2", mean: "24.4 ± 1.2", eoa: "1.2 ± 0.1" },
  ]},
  { name: "Carbomedics Standard", category: "mechanical", sizes: [
    { size: "19", peak: "38.0 ± 12.8", mean: "18.9 ± 8.3", eoa: "1.0 ± 0.3" },
    { size: "21", peak: "26.8 ± 10.1", mean: "12.9 ± 5.4", eoa: "1.5 ± 0.4" },
    { size: "23", peak: "22.5 ± 7.4", mean: "11.0 ± 4.6", eoa: "1.4 ± 0.3" },
    { size: "25", peak: "19.6 ± 7.8", mean: "9.1 ± 3.5", eoa: "1.8 ± 0.4" },
    { size: "27", peak: "17.5 ± 7.1", mean: "7.9 ± 3.2", eoa: "2.2 ± 0.2" },
    { size: "29", peak: "9.1 ± 4.7", mean: "5.6 ± 3.0", eoa: "3.2 ± 1.6" },
  ]},
  { name: "Carbomedics Tophat", category: "mechanical", inferred: true, sizes: [
    { size: "21", peak: "30.2 ± 10.9", mean: "14.9 ± 5.4", eoa: "1.2 ± 0.3" },
    { size: "23", peak: "24.2 ± 7.6", mean: "12.5 ± 4.4", eoa: "1.4 ± 0.4" },
    { size: "25", mean: "9.5 ± 2.9", eoa: "1.6 ± 0.32" },
  ]},
  { name: "Carpentier Edwards Pericardial", category: "biological", sizes: [
    { size: "19", peak: "32.1 ± 3.4", mean: "24.2 ± 8.6", eoa: "1.2 ± 0.3" },
    { size: "21", peak: "25.7 ± 9.9", mean: "20.3 ± 9.1", eoa: "1.5 ± 0.4" },
    { size: "23", peak: "21.7 ± 8.6", mean: "13.0 ± 5.3", eoa: "1.8 ± 0.3" },
    { size: "25", peak: "16.5 ± 5.4", mean: "9.0 ± 2.3" },
  ]},
  { name: "Carpentier Edwards Standard", category: "biological", sizes: [
    { size: "19", peak: "43.5 ± 12.7", mean: "25.6 ± 8.0", eoa: "0.9 ± 0.2" },
    { size: "21", peak: "27.7 ± 7.6", mean: "17.3 ± 6.2", eoa: "1.5 ± 0.3" },
    { size: "23", peak: "28.9 ± 7.5", mean: "16.1 ± 6.2", eoa: "1.7 ± 0.5" },
    { size: "25", peak: "24.0 ± 7.1", mean: "12.9 ± 4.6", eoa: "1.9 ± 0.5" },
    { size: "27", peak: "22.1 ± 8.2", mean: "12.1 ± 5.5", eoa: "2.3 ± 0.6" },
    { size: "29", mean: "9.9 ± 2.9", eoa: "2.8 ± 0.5" },
  ]},
  { name: "Carpentier Supra-Annular", category: "biological", sizes: [
    { size: "19", peak: "34.1 ± 2.7", eoa: "1.1 ± 0.1" },
    { size: "21", peak: "28.0 ± 10.5", mean: "17.5 ± 3.8", eoa: "1.4 ± 0.9" },
    { size: "23", peak: "25.3 ± 10.5", mean: "13.4 ± 4.5", eoa: "1.6 ± 0.6" },
    { size: "25", peak: "24.4 ± 7.6", mean: "13.2 ± 4.8", eoa: "1.8 ± 0.4" },
    { size: "27", peak: "16.7 ± 4.7", mean: "8.8 ± 2.8", eoa: "1.9 ± 0.7" },
  ]},
  { name: "Cryolife", category: "biological", sizes: [
    { size: "19", mean: "9.0 ± 2.0", eoa: "1.5 ± 0.3" },
    { size: "21", mean: "6.6 ± 2.9", eoa: "1.7 ± 0.4" },
    { size: "23", mean: "6.0 ± 2.3", eoa: "2.3 ± 0.2" },
    { size: "25", mean: "6.1 ± 2.6", eoa: "2.6 ± 0.2" },
    { size: "27", mean: "4.0 ± 2.4", eoa: "2.8 ± 0.3" },
  ]},
  { name: "Edwards Duromedics", category: "mechanical", sizes: [
    { size: "21", peak: "39.0 ± 13" },
    { size: "23", peak: "32.0 ± 8.0" },
    { size: "25", peak: "26.0 ± 10.0" },
    { size: "27", peak: "24.0 ± 10.0" },
  ]},
  { name: "Edwards Inspiris Resilia", category: "biological", inferred: true, sizes: [
    { size: "19", mean: "17.6 ± 7.8", eoa: "1.1 ± 0.2" },
    { size: "21", mean: "12.6 ± 4.7", eoa: "1.3 ± 0.3" },
    { size: "23", mean: "10.1 ± 3.8", eoa: "1.6 ± 0.4" },
    { size: "25", mean: "9.6 ± 5.2", eoa: "1.8 ± 0.5" },
    { size: "27", mean: "8.2 ± 3.5", eoa: "2.2 ± 0.6" },
  ]},
  { name: "Edwards Intuity", category: "biological", inferred: true, sizes: [
    { size: "19", mean: "13.9 ± 3.9", eoa: "1.1 ± 0.1" },
    { size: "21", mean: "11.6 ± 3.6", eoa: "1.3 ± 0.1" },
    { size: "23", mean: "10.4 ± 3.5", eoa: "1.7 ± 0.2" },
    { size: "25", mean: "9.1 ± 3.2", eoa: "1.9 ± 0.2" },
    { size: "27", mean: "8.3 ± 3.7", eoa: "2.2 ± 0.2" },
  ]},
  { name: "Edwards Mira", category: "mechanical", sizes: [
    { size: "19", mean: "18.2 ± 5.3", eoa: "1.2 ± 0.4" },
    { size: "21", mean: "13.3 ± 4.3", eoa: "1.6 ± 0.4" },
    { size: "23", mean: "14.7 ± 2.8", eoa: "1.6 ± 0.6" },
    { size: "25", mean: "13.1 ± 3.8", eoa: "1.9" },
  ]},
  { name: "Edwards Mosaic", category: "biological", inferred: true, sizes: [
    { size: "21", mean: "13.3 ± 5.3", eoa: "1.4 ± 0.4" },
    { size: "23", mean: "11.8 ± 4.9", eoa: "1.6 ± 0.5" },
    { size: "25", mean: "10.6 ± 4.4", eoa: "1.8 ± 0.5" },
    { size: "27", mean: "9.1 ± 4.0", eoa: "2.0 ± 0.5" },
    { size: "29", mean: "8.6 ± 2.9", eoa: "2.3 ± 0.6" },
  ]},
  { name: "Hancock", category: "biological", sizes: [
    { size: "21", peak: "18.0 ± 6.0", mean: "12.0 ± 2.0" },
    { size: "23", peak: "16.0 ± 2.0", mean: "11.0 ± 2.0" },
    { size: "25", peak: "15.0 ± 3.0", mean: "10.0 ± 3.0" },
  ]},
  { name: "Hancock II", category: "biological", sizes: [
    { size: "21", mean: "14.8 ± 4.1", eoa: "1.3 ± 0.4" },
    { size: "23", peak: "34.0 ± 13.0", mean: "16.6 ± 8.5", eoa: "1.3 ± 0.4" },
    { size: "25", peak: "22.0 ± 5.3", mean: "10.8 ± 2.8", eoa: "1.6 ± 0.4" },
    { size: "29", peak: "16.2 ± 1.5", mean: "8.2 ± 1.7", eoa: "1.6 ± 0.2" },
  ]},
  { name: "Homograft", category: "biological", sizes: [
    { size: "17-19", mean: "9.7 ± 4.2", eoa: "4.2 ± 1.8" },
    { size: "19-21", eoa: "5.4 ± 0.9" },
    { size: "20-21", mean: "7.9 ± 4.0", eoa: "3.6 ± 2.0" },
    { size: "20-22", mean: "7.2 ± 3.0", eoa: "3.5 ± 1.5" },
    { size: "22", peak: "1.7 ± 0.3", eoa: "5.8 ± 3.2" },
    { size: "22-23", mean: "5.6 ± 3.1", eoa: "2.6 ± 1.4" },
    { size: "22-24", eoa: "5.6 ± 1.7" },
    { size: "24-27", mean: "6.2 ± 2.6", eoa: "2.8 ± 1.1" },
    { size: "26", peak: "1.4 ± 0.6", eoa: "6.8 ± 2.9" },
    { size: "25-28", eoa: "6.2 ± 2.5" },
  ]},
  { name: "Intact", category: "biological", sizes: [
    { size: "19", peak: "40.4 ± 15.4", mean: "24.5 ± 9.3" },
    { size: "21", peak: "40.9 ± 15.6", mean: "19.6 ± 8.1", eoa: "1.6 ± 0.4" },
    { size: "23", peak: "32.7 ± 9.6", mean: "19.0 ± 6.1", eoa: "1.6 ± 0.4" },
    { size: "25", peak: "29.7 ± 15.0", mean: "17.7 ± 7.9", eoa: "1.7 ± 0.3" },
    { size: "27", peak: "25.0 ± 7.6", mean: "15.0 ± 4.5" },
  ]},
  { name: "Ionescu-Shiley", category: "biological", sizes: [
    { size: "17", peak: "23.8 ± 3.4", eoa: "0.9 ± 0.1" },
    { size: "19", peak: "19.7 ± 5.9", mean: "13.3 ± 3.9", eoa: "1.1 ± 0.1" },
    { size: "21", peak: "26.6 ± 9.0" },
    { size: "23", mean: "15.6 ± 4.4" },
  ]},
  { name: "Labcor Santiago", category: "biological", sizes: [
    { size: "19", peak: "18.6 ± 5.0", mean: "11.8 ± 3.3", eoa: "1.2 ± 0.1" },
    { size: "21", peak: "17.5 ± 6.6", mean: "8.2 ± 4.5", eoa: "1.3 ± 0.1" },
    { size: "23", peak: "14.8 ± 5.2", mean: "7.8 ± 2.9", eoa: "1.8 ± 0.2" },
    { size: "25", peak: "12.3 ± 3.4", mean: "6.8 ± 2.0", eoa: "2.1 ± 0.3" },
  ]},
  { name: "Labcor Synergy", category: "biological", sizes: [
    { size: "21", peak: "24.3 ± 8.1", mean: "13.3 ± 4.2", eoa: "1.1 ± 0.3" },
    { size: "23", peak: "27.3 ± 13.7", mean: "15.3 ± 6.9", eoa: "1.4 ± 0.4" },
    { size: "25", peak: "22.5 ± 11.9", mean: "13.2 ± 6.4", eoa: "1.5 ± 0.4" },
    { size: "27", peak: "17.8 ± 7.0", mean: "10.6 ± 4.6", eoa: "1.8 ± 0.5" },
  ]},
  { name: "MCRI On-X", category: "mechanical", sizes: [
    { size: "19", peak: "21.3 ± 10.8", mean: "11.8 ± 3.4", eoa: "1.5 ± 0.2" },
    { size: "21", peak: "16.4 ± 5.9", mean: "9.9 ± 3.6", eoa: "1.7 ± 0.4" },
    { size: "23", peak: "15.9 ± 6.4", mean: "8.6 ± 3.4", eoa: "1.9 ± 0.6" },
    { size: "25", peak: "16.5 ± 10.2", mean: "6.9 ± 4.3", eoa: "2.4 ± 0.6" },
  ]},
  { name: "Medtronic Advantage", category: "mechanical", sizes: [
    { size: "23", mean: "10.4 ± 3.1", eoa: "2.2 ± 0.3" },
    { size: "25", mean: "9.0 ± 3.7", eoa: "2.8 ± 0.6" },
    { size: "27", mean: "7.6 ± 3.6", eoa: "3.3 ± 0.7" },
    { size: "29", mean: "6.1 ± 3.8", eoa: "3.9 ± 0.7" },
  ]},
  { name: "Medtronic Avalus", category: "biological", inferred: true, sizes: [
    { size: "19", mean: "17.1 ± 5.0", eoa: "1.11 ± 0.25" },
    { size: "21", mean: "14.5 ± 4.3", eoa: "1.25 ± 0.25" },
    { size: "23", mean: "12.1 ± 3.8", eoa: "1.47 ± 0.32" },
    { size: "25", mean: "11.7 ± 4.0", eoa: "1.57 ± 0.31" },
    { size: "27", mean: "10.3 ± 4.2", eoa: "1.77 ± 0.41" },
  ]},
  { name: "Medtronic Freestyle", category: "biological", sizes: [
    { size: "19", mean: "13.0 ± 3.9" },
    { size: "21", mean: "9.1 ± 5.1", eoa: "1.4 ± 0.3" },
    { size: "23", peak: "11.0 ± 4.0", mean: "8.1 ± 4.6", eoa: "1.7 ± 0.5" },
    { size: "25", mean: "5.3 ± 3.1", eoa: "2.1 ± 0.5" },
    { size: "27", mean: "4.6 ± 3.1", eoa: "2.5 ± 0.1" },
  ]},
  { name: "Medtronic-Hall", category: "mechanical", sizes: [
    { size: "20", peak: "34.4 ± 13.1", mean: "17.1 ± 5.3", eoa: "1.2 ± 0.5" },
    { size: "21", peak: "26.9 ± 10.5", mean: "14.1 ± 5.9", eoa: "1.1 ± 0.2" },
    { size: "23", peak: "26.9 ± 8.9", mean: "13.5 ± 4.8", eoa: "1.4 ± 0.4" },
    { size: "25", peak: "17.1 ± 7.0", mean: "9.5 ± 4.3", eoa: "1.5 ± 0.5" },
    { size: "27", peak: "18.9 ± 9.7", mean: "8.7 ± 5.6", eoa: "1.9 ± 0.2" },
  ]},
  { name: "Medtronic Mosaic", category: "biological", inferred: true, sizes: [
    { size: "21", mean: "14.2 ± 5.0", eoa: "1.4 ± 0.4" },
    { size: "23", peak: "23.8 ± 11.0", mean: "13.7 ± 4.8", eoa: "1.5 ± 0.4" },
    { size: "25", peak: "22.5 ± 10.0", mean: "11.7 ± 5.1", eoa: "1.8 ± 0.5" },
    { size: "27", mean: "10.4 ± 4.3", eoa: "1.9 ± 0.1" },
    { size: "29", mean: "11.1 ± 4.3", eoa: "2.1 ± 0.2" },
  ]},
  { name: "Mitroflow", category: "biological", sizes: [
    { size: "19", peak: "18.6 ± 5.3", mean: "13.1 ± 3.3", eoa: "1.1 ± 0.2" },
  ]},
  { name: "Monostrut Bjork-Shiley", category: "mechanical", sizes: [
    { size: "19", mean: "27.4 ± 8.8" },
    { size: "21", peak: "27.5 ± 3.1", mean: "20.5 ± 6.2" },
    { size: "23", peak: "20.3 ± 0.7", mean: "17.4 ± 6.4" },
    { size: "25", mean: "16.1 ± 4.9" },
    { size: "27", mean: "11.4 ± 3.8" },
  ]},
  { name: "Prima", category: "biological", inferred: true, sizes: [
    { size: "21", peak: "28.8 ± 6.0", mean: "13.7 ± 1.9", eoa: "1.4 ± 0.7" },
    { size: "23", peak: "21.5 ± 7.5", mean: "11.5 ± 4.9", eoa: "1.5 ± 0.3" },
    { size: "25", peak: "22.1 ± 12.5", mean: "11.6 ± 7.2", eoa: "1.8 ± 0.5" },
  ]},
  { name: "Omnicarbon", category: "mechanical", sizes: [
    { size: "21", peak: "37.4 ± 12.8", mean: "20.4 ± 5.4", eoa: "1.3 ± 0.5" },
    { size: "23", peak: "28.8 ± 9.1", mean: "17.4 ± 4.9", eoa: "1.5 ± 0.3" },
    { size: "25", peak: "23.7 ± 8.1", mean: "13.2 ± 4.6", eoa: "1.9 ± 0.5" },
    { size: "27", peak: "20.1 ± 4.2", mean: "12.4 ± 2.9", eoa: "2.1 ± 0.4" },
  ]},
  { name: "Omniscience", category: "mechanical", sizes: [
    { size: "21", peak: "50.8 ± 2.8", mean: "28.2 ± 2.2", eoa: "0.9 ± 0.1" },
    { size: "23", peak: "39.8 ± 8.7", mean: "20.1 ± 5.1", eoa: "1.0 ± 0.1" },
  ]},
  { name: "Starr-Edwards", category: "mechanical", sizes: [
    { size: "23", peak: "32.6 ± 12.8", mean: "22.0 ± 9.0", eoa: "1.1 ± 0.2" },
    { size: "24", peak: "34.1 ± 10.3", mean: "22.1 ± 7.5", eoa: "1.1 ± 0.3" },
    { size: "26", peak: "31.8 ± 9.0", mean: "19.7 ± 6.1" },
    { size: "27", peak: "30.8 ± 6.3", mean: "18.5 ± 3.7" },
    { size: "29", peak: "29.0 ± 9.3", mean: "16.3 ± 5.5" },
  ]},
  { name: "Sorin Bicarbon", category: "mechanical", sizes: [
    { size: "19", peak: "30.1 ± 4.5", mean: "16.7 ± 2.0", eoa: "1.4 ± 0.1" },
    { size: "21", peak: "22.0 ± 7.1", mean: "10.0 ± 3.3", eoa: "1.2 ± 0.4" },
    { size: "23", peak: "16.8 ± 6.1", mean: "7.7 ± 3.3", eoa: "1.5 ± 0.2" },
    { size: "25", peak: "11.2 ± 3.1", mean: "5.6 ± 1.6", eoa: "2.4 ± 0.3" },
  ]},
  { name: "Sorin Pericarbon Stentless", category: "biological", sizes: [
    { size: "19", peak: "36.5 ± 9.0", mean: "28.9 ± 7.3", eoa: "1.2 ± 0.5" },
    { size: "21", peak: "28.0 ± 13.3", mean: "23.8 ± 11.1", eoa: "1.3 ± 0.6" },
    { size: "23", peak: "27.5 ± 11.5", mean: "23.2 ± 7.6", eoa: "1.5 ± 0.5" },
  ]},
  { name: "Sorin Perceval Sutureless", category: "biological", inferred: true, sizes: [
    { size: "S (21)", mean: "10.1 ± 4.2", eoa: "1.3 ± 0.3" },
    { size: "M (23)", mean: "9.4 ± 5.5", eoa: "1.5 ± 0.4" },
    { size: "L (25)", mean: "8.5 ± 4.6", eoa: "1.5 ± 0.4" },
    { size: "XL (27)", mean: "9.7 ± 4.7", eoa: "1.6 ± 0.4" },
  ]},
  { name: "St. Jude Medical Haem Plus Bileaflet", category: "mechanical", sizes: [
    { size: "19", peak: "28.5 ± 10.7", mean: "17.0 ± 7.8", eoa: "1.9 ± 0.1" },
    { size: "21", peak: "16.3 ± 17.0", mean: "10.6 ± 5.1", eoa: "1.8 ± 0.5" },
    { size: "23", peak: "16.8 ± 7.3", mean: "12.1 ± 4.2", eoa: "1.7 ± 0.5" },
  ]},
  { name: "St. Jude Medical Regent Bileaflet", category: "mechanical", sizes: [
    { size: "19", peak: "20.6 ± 12", mean: "11.0 ± 4.9", eoa: "1.6 ± 0.4" },
    { size: "21", peak: "15.6 ± 9.4", mean: "8.0 ± 4.8", eoa: "2.0 ± 0.7" },
    { size: "23", peak: "12.8 ± 6.8", mean: "6.9 ± 3.5", eoa: "2.3 ± 0.9" },
    { size: "25", peak: "11.7 ± 6.8", mean: "5.6 ± 3.2", eoa: "2.5 ± 0.8" },
    { size: "27", peak: "7.9 ± 5.5", mean: "3.5 ± 1.7", eoa: "3.6 ± 0.5" },
  ]},
  { name: "St. Jude Medical Standard Bileaflet", category: "mechanical", sizes: [
    { size: "19", peak: "42.0 ± 10.0", mean: "24.5 ± 5.8", eoa: "1.5 ± 0.1" },
    { size: "21", peak: "25.7 ± 9.5", mean: "15.2 ± 5.0", eoa: "1.4 ± 0.4" },
    { size: "23", peak: "21.8 ± 7.5", mean: "13.4 ± 5.6", eoa: "1.6 ± 0.4" },
    { size: "25", peak: "18.9 ± 7.3", mean: "11.0 ± 5.3", eoa: "1.9 ± 0.5" },
    { size: "27", peak: "13.7 ± 4.2", mean: "8.4 ± 3.4", eoa: "2.5 ± 0.4" },
    { size: "29", peak: "13.5 ± 5.8", mean: "7.0 ± 1.7", eoa: "2.8 ± 0.5" },
  ]},
  { name: "St. Jude Medical Stentless", category: "biological", sizes: [
    { size: "21", peak: "22.6 ± 14.5", mean: "10.7 ± 7.2", eoa: "1.3 ± 0.6" },
    { size: "23", peak: "16.2 ± 9.0", mean: "8.2 ± 4.7", eoa: "1.6 ± 0.6" },
    { size: "25", peak: "12.7 ± 8.2", mean: "6.3 ± 4.1", eoa: "1.8 ± 0.5" },
    { size: "27", peak: "10.1 ± 5.8", mean: "5.0 ± 2.9", eoa: "2.0 ± 0.3" },
    { size: "29", peak: "7.7 ± 4.4", mean: "4.1 ± 2.4", eoa: "2.4 ± 0.6" },
  ]},

  // ---- THIRD-PARTY DATA (thirdParty: true): NOT from the Zoghbi 2024 guideline
  // and not verified against any manufacturer/primary source (v4.30 audit found
  // none publishes per-size values; Crown 21 has a ± 0.0 SD, Magna Ease 19 mean
  // looks inconsistent). The UI shows a note on these. Added from a valve-reference app's own per-size screenshots (not
  // the Zoghbi 2024 appendix tables above) — mechanical/biological category
  // taken from how the source screenshots were organized (folders named
  // "Mechanical"/"Biological"), each also naming a bileaflet mechanism or a
  // pericardial/porcine leaflet material consistent with that category.
  // Some sizes show identical peak/mean/EOA to the adjacent size in the
  // source screenshot itself (Carbomedics Orbis 29 vs 31, CE STD 2625 29 vs
  // 31) — transcribed as shown rather than assumed to be an error, since
  // it isn't possible to tell from a screenshot alone whether that reflects
  // no distinct data being available for that size in the source.
  // Carbomedics Orbis and CE STD 2625 duplicate the existing Carbomedics
  // Standard / Carpentier Edwards Standard entries above almost exactly —
  // likely the same physical valves under a different model name/number —
  // but are kept as separate entries since that's the name this source
  // uses, rather than merged into or renamed from the existing ones.
  { name: "Carbomedics Orbis", thirdParty: true, category: "mechanical", sizes: [
    { size: "19", peak: "38.0 ± 12.8", mean: "18.9 ± 8.3", eoa: "1.0 ± 0.3" },
    { size: "21", peak: "26.8 ± 10.1", mean: "12.9 ± 5.4", eoa: "1.4 ± 0.4" },
    { size: "23", peak: "22.5 ± 7.4", mean: "11.0 ± 4.6", eoa: "1.5 ± 0.3" },
    { size: "25", peak: "19.6 ± 7.8", mean: "9.1 ± 3.5", eoa: "1.8 ± 0.4" },
    { size: "27", peak: "17.5 ± 7.1", mean: "7.9 ± 3.2", eoa: "2.2 ± 0.2" },
    { size: "29", peak: "9.1 ± 4.7", mean: "5.6 ± 3.0", eoa: "3.2 ± 1.6" },
    { size: "31", peak: "9.1 ± 4.7", mean: "5.6 ± 3.0", eoa: "3.2 ± 1.6" },
  ]},
  { name: "Medtronic Open Pivot AP", thirdParty: true, category: "mechanical", sizes: [
    { size: "18", mean: "21.0 ± 1.8", eoa: "1.2 ± 0.3" },
    { size: "20", peak: "21.4 ± 4.2", mean: "11.1 ± 3.5", eoa: "1.3 ± 0.3" },
    { size: "22", peak: "18.7 ± 8.3", mean: "10.5 ± 4.5", eoa: "1.7 ± 0.4" },
    { size: "24", peak: "15.1 ± 5.6", mean: "7.5 ± 3.1", eoa: "2.0 ± 0.6" },
    { size: "26", mean: "6.0 ± 2.0", eoa: "2.1 ± 0.4" },
    { size: "28", eoa: "2.3" },
  ]},
  { name: "Medtronic Open Pivot Standard", thirdParty: true, category: "mechanical", sizes: [
    { size: "19", peak: "47.0 ± 12.6", mean: "25.3 ± 8.0", eoa: "1.1 ± 0.3" },
    { size: "21", peak: "23.7 ± 6.8", mean: "15.9 ± 5.0", eoa: "1.4 ± 0.5" },
    { size: "23", peak: "19.0 ± 7.0", mean: "14.4 ± 4.9", eoa: "1.7 ± 0.5" },
    { size: "25", peak: "17.0 ± 8.0", mean: "11.3 ± 3.7", eoa: "2.1 ± 0.7" },
    { size: "27", peak: "14.0 ± 4.0", mean: "8.4 ± 3.7", eoa: "2.5 ± 0.1" },
    { size: "29", peak: "11.0 ± 3.0", mean: "8.0 ± 3.0", eoa: "3.1 ± 0.8" },
  ]},
  { name: "CE Magna 3000", thirdParty: true, category: "biological", sizes: [
    { size: "19", peak: "22.9 ± 8.0", mean: "11.9 ± 4.1", eoa: "1.3 ± 0.3" },
    { size: "21", peak: "18.2 ± 5.8", mean: "9.8 ± 3.3", eoa: "1.5 ± 0.3" },
    { size: "23", peak: "17.6 ± 5.7", mean: "9.1 ± 3.3", eoa: "1.8 ± 0.4" },
    { size: "25", peak: "16.3 ± 4.8", mean: "8.4 ± 2.6", eoa: "2.1 ± 0.5" },
    { size: "27", mean: "11.3 ± 5.0", eoa: "2.4" },
    { size: "29", mean: "11.3 ± 5.0", eoa: "2.5" },
  ]},
  { name: "CE Magna Ease 3300", thirdParty: true, category: "biological", sizes: [
    { size: "19", peak: "22.9 ± 8.0", mean: "17.7 ± 0.2", eoa: "1.2 ± 0.1" },
    { size: "21", peak: "18.2 ± 5.8", mean: "9.8 ± 3.3", eoa: "1.4 ± 0.4" },
    { size: "23", peak: "17.6 ± 5.7", mean: "9.1 ± 3.3", eoa: "1.8 ± 0.3" },
    { size: "25", peak: "16.3 ± 4.8", mean: "8.4 ± 2.6", eoa: "2.1 ± 0.5" },
    { size: "27", mean: "11.3 ± 5.0", eoa: "2.4" },
    { size: "29", mean: "11.3 ± 5.0", eoa: "2.5" },
  ]},
  { name: "CE STD 2625", thirdParty: true, category: "biological", sizes: [
    { size: "19", peak: "43.5 ± 12.7", mean: "25.6 ± 8.0", eoa: "0.9 ± 0.2" },
    { size: "21", peak: "27.7 ± 7.6", mean: "17.3 ± 6.2", eoa: "1.5 ± 0.3" },
    { size: "23", peak: "28.9 ± 7.5", mean: "16.1 ± 6.2", eoa: "1.7 ± 0.5" },
    { size: "25", peak: "24.0 ± 7.1", mean: "12.9 ± 4.6", eoa: "1.9 ± 0.5" },
    { size: "27", peak: "22.1 ± 8.2", mean: "12.1 ± 5.5", eoa: "2.3 ± 0.6" },
    { size: "29", mean: "9.9 ± 2.9", eoa: "2.8 ± 0.5" },
    { size: "31", mean: "9.9 ± 2.9", eoa: "2.8 ± 0.5" },
  ]},
  { name: "Crown", thirdParty: true, category: "biological", sizes: [
    { size: "19", peak: "18.7 ± 5.1", mean: "13.1 ± 3.3", eoa: "1.1 ± 0.2" },
    { size: "21", peak: "20.2 ± 0.0", mean: "15.4 ± 0.0", eoa: "1.3 ± 0.3" },
    { size: "23", peak: "14.04 ± 4.9", mean: "7.6 ± 3.4", eoa: "1.5 ± 0.3" },
    { size: "25", peak: "17.0 ± 11.31", mean: "6.6 ± 1.7", eoa: "1.8 ± 0.3" },
    { size: "27", peak: "13.0 ± 3.0", mean: "6.6 ± 1.7", eoa: "1.8 ± 0.3" },
    { size: "29", eoa: "2.0 ± 0.4" },
  ]},
  { name: "Freestyle Root", thirdParty: true, category: "biological", sizes: [
    { size: "19", mean: "13.0 ± 3.9", eoa: "1.2 ± 0.2" },
    { size: "21", mean: "7.9 ± 2.6", eoa: "1.4 ± 0.2" },
    { size: "23", peak: "11.0 ± 4.0", mean: "7.2 ± 2.5", eoa: "1.7 ± 0.3" },
    { size: "25", mean: "5.4 ± 1.5", eoa: "2.1 ± 0.4" },
    { size: "27", mean: "4.7 ± 1.6", eoa: "2.5 ± 0.5" },
    { size: "29", eoa: "2.5" },
  ]},
];
