/* ============================================================
   WORLD COUNTRY FLAG BATTLE — countries.js
   Country / territory dataset + flag emoji generation.
   No network calls, no image downloads — flags are rendered
   from Unicode regional indicator symbols so the game never
   depends on external assets. If a PNG is later dropped into
   assets/flags/<CODE>.png it will automatically be preferred
   (see FlagArt.resolve in game.js).
   ============================================================ */

(function (global) {
  "use strict";

  // code | name  (233 entries: UN member states + widely recognised territories)
  const RAW = `
DZ|Algeria
AO|Angola
BJ|Benin
BW|Botswana
BF|Burkina Faso
BI|Burundi
CV|Cabo Verde
CM|Cameroon
CF|Central African Republic
TD|Chad
KM|Comoros
CG|Congo
CD|DR Congo
CI|Cote d'Ivoire
DJ|Djibouti
EG|Egypt
GQ|Equatorial Guinea
ER|Eritrea
SZ|Eswatini
ET|Ethiopia
GA|Gabon
GM|Gambia
GH|Ghana
GN|Guinea
GW|Guinea-Bissau
KE|Kenya
LS|Lesotho
LR|Liberia
LY|Libya
MG|Madagascar
MW|Malawi
ML|Mali
MR|Mauritania
MU|Mauritius
MA|Morocco
MZ|Mozambique
NA|Namibia
NE|Niger
NG|Nigeria
RW|Rwanda
ST|Sao Tome and Principe
SN|Senegal
SC|Seychelles
SL|Sierra Leone
SO|Somalia
ZA|South Africa
SS|South Sudan
SD|Sudan
TZ|Tanzania
TG|Togo
TN|Tunisia
UG|Uganda
ZM|Zambia
ZW|Zimbabwe
EH|Western Sahara
RE|Reunion
YT|Mayotte
SH|Saint Helena
US|United States
CA|Canada
MX|Mexico
BZ|Belize
CR|Costa Rica
SV|El Salvador
GT|Guatemala
HN|Honduras
NI|Nicaragua
PA|Panama
AG|Antigua and Barbuda
BS|Bahamas
BB|Barbados
CU|Cuba
DM|Dominica
DO|Dominican Republic
GD|Grenada
HT|Haiti
JM|Jamaica
KN|Saint Kitts and Nevis
LC|Saint Lucia
VC|Saint Vincent
TT|Trinidad and Tobago
AR|Argentina
BO|Bolivia
BR|Brazil
CL|Chile
CO|Colombia
EC|Ecuador
GY|Guyana
PY|Paraguay
PE|Peru
SR|Suriname
UY|Uruguay
VE|Venezuela
PR|Puerto Rico
VI|U.S. Virgin Islands
VG|British Virgin Islands
KY|Cayman Islands
BM|Bermuda
GL|Greenland
TC|Turks and Caicos
AI|Anguilla
MS|Montserrat
AW|Aruba
CW|Curacao
SX|Sint Maarten
GP|Guadeloupe
MQ|Martinique
FK|Falkland Islands
PM|Saint Pierre and Miquelon
BL|Saint Barthelemy
MF|Saint Martin
AF|Afghanistan
AM|Armenia
AZ|Azerbaijan
BH|Bahrain
BD|Bangladesh
BT|Bhutan
BN|Brunei
KH|Cambodia
CN|China
CY|Cyprus
GE|Georgia
IN|India
ID|Indonesia
IR|Iran
IQ|Iraq
IL|Israel
JP|Japan
JO|Jordan
KZ|Kazakhstan
KW|Kuwait
KG|Kyrgyzstan
LA|Laos
LB|Lebanon
MY|Malaysia
MV|Maldives
MN|Mongolia
MM|Myanmar
NP|Nepal
KP|North Korea
OM|Oman
PK|Pakistan
PS|Palestine
PH|Philippines
QA|Qatar
SA|Saudi Arabia
SG|Singapore
KR|South Korea
LK|Sri Lanka
SY|Syria
TW|Taiwan
TJ|Tajikistan
TH|Thailand
TL|Timor-Leste
TR|Turkiye
TM|Turkmenistan
AE|United Arab Emirates
UZ|Uzbekistan
VN|Vietnam
YE|Yemen
HK|Hong Kong
MO|Macau
AL|Albania
AD|Andorra
AT|Austria
BY|Belarus
BE|Belgium
BA|Bosnia and Herzegovina
BG|Bulgaria
HR|Croatia
CZ|Czechia
DK|Denmark
EE|Estonia
FI|Finland
FR|France
DE|Germany
GR|Greece
HU|Hungary
IS|Iceland
IE|Ireland
IT|Italy
XK|Kosovo
LV|Latvia
LI|Liechtenstein
LT|Lithuania
LU|Luxembourg
MT|Malta
MD|Moldova
MC|Monaco
ME|Montenegro
NL|Netherlands
MK|North Macedonia
NO|Norway
PL|Poland
PT|Portugal
RO|Romania
RU|Russia
SM|San Marino
RS|Serbia
SK|Slovakia
SI|Slovenia
ES|Spain
SE|Sweden
CH|Switzerland
UA|Ukraine
GB|United Kingdom
VA|Vatican City
FO|Faroe Islands
GI|Gibraltar
IM|Isle of Man
JE|Jersey
GG|Guernsey
AX|Aland Islands
AU|Australia
FJ|Fiji
KI|Kiribati
MH|Marshall Islands
FM|Micronesia
NR|Nauru
NZ|New Zealand
PW|Palau
PG|Papua New Guinea
WS|Samoa
SB|Solomon Islands
TO|Tonga
TV|Tuvalu
VU|Vanuatu
NC|New Caledonia
PF|French Polynesia
GU|Guam
AS|American Samoa
CK|Cook Islands
NU|Niue
TK|Tokelau
WF|Wallis and Futuna
`.trim();

  function codeToFlagEmoji(code) {
    // Regional indicator symbols start at 0x1F1E6 for 'A'
    const A = 0x1f1e6;
    let out = "";
    for (const ch of code.toUpperCase()) {
      const offset = ch.charCodeAt(0) - 65; // 'A' = 65
      if (offset < 0 || offset > 25) return "🏳️";
      out += String.fromCodePoint(A + offset);
    }
    return out;
  }

  const COUNTRIES = RAW.split("\n")
    .map((line) => line.split("|"))
    .filter((parts) => parts.length === 2)
    .map(([code, name], idx) => ({
      id: idx,
      code: code.trim(),
      name: name.trim(),
      emoji: codeToFlagEmoji(code.trim()),
    }));

  global.WCFB = global.WCFB || {};
  global.WCFB.COUNTRIES = COUNTRIES;
  global.WCFB.codeToFlagEmoji = codeToFlagEmoji;
})(window);
