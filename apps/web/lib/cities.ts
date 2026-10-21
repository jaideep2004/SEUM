/**
 * City list with English + Arabic (MSA) names for flight From/To selects.
 * Stored values are ALWAYS the English name (stable for API/reports).
 * Each entry carries its serving airport (name EN/AR + IATA) so the
 * dropdown labels read "City — Airport Name (IATA)" (client request).
 * Saudi cities are comprehensive; international entries cover major hubs.
 */

export interface City {
  en: string;
  ar: string;
  countryEn: string;
  iata?: string;
  airportEn?: string;
  airportAr?: string;
}

export const CITIES: City[] = [
  // ─── Saudi Arabia ───
  { en: "Jeddah", ar: "جدة", countryEn: "Saudi Arabia", iata: "JED", airportEn: "King Abdulaziz International Airport", airportAr: "مطار الملك عبدالعزيز الدولي" },
  { en: "Makkah", ar: "مكة المكرمة", countryEn: "Saudi Arabia" },
  { en: "Madinah", ar: "المدينة المنورة", countryEn: "Saudi Arabia", iata: "MED", airportEn: "Prince Mohammad bin Abdulaziz International Airport", airportAr: "مطار الأمير محمد بن عبدالعزيز الدولي" },
  { en: "Riyadh", ar: "الرياض", countryEn: "Saudi Arabia", iata: "RUH", airportEn: "King Khalid International Airport", airportAr: "مطار الملك خالد الدولي" },
  { en: "Dammam", ar: "الدمام", countryEn: "Saudi Arabia", iata: "DMM", airportEn: "King Fahd International Airport", airportAr: "مطار الملك فهد الدولي" },
  { en: "Khobar", ar: "الخبر", countryEn: "Saudi Arabia", iata: "DMM", airportEn: "King Fahd International Airport", airportAr: "مطار الملك فهد الدولي" },
  { en: "Dhahran", ar: "الظهران", countryEn: "Saudi Arabia", iata: "DMM", airportEn: "King Fahd International Airport", airportAr: "مطار الملك فهد الدولي" },
  { en: "Jubail", ar: "الجبيل", countryEn: "Saudi Arabia", iata: "DMM", airportEn: "King Fahd International Airport", airportAr: "مطار الملك فهد الدولي" },
  { en: "Taif", ar: "الطائف", countryEn: "Saudi Arabia", iata: "TIF", airportEn: "Taif International Airport", airportAr: "مطار الطائف الدولي" },
  { en: "Abha", ar: "أبها", countryEn: "Saudi Arabia", iata: "AHB", airportEn: "Abha International Airport", airportAr: "مطار أبها الدولي" },
  { en: "Tabuk", ar: "تبوك", countryEn: "Saudi Arabia", iata: "TUU", airportEn: "Tabuk Regional Airport", airportAr: "مطار تبوك الإقليمي" },
  { en: "Buraidah", ar: "بريدة", countryEn: "Saudi Arabia", iata: "ELQ", airportEn: "Prince Naif bin Abdulaziz International Airport", airportAr: "مطار الأمير نايف بن عبدالعزيز الدولي" },
  { en: "Hail", ar: "حائل", countryEn: "Saudi Arabia", iata: "HAS", airportEn: "Ha'il International Airport", airportAr: "مطار حائل الدولي" },
  { en: "Najran", ar: "نجران", countryEn: "Saudi Arabia", iata: "NJD", airportEn: "Najran Domestic Airport", airportAr: "مطار نجران" },
  { en: "Jazan", ar: "جازان", countryEn: "Saudi Arabia", iata: "GIZ", airportEn: "King Abdullah bin Abdulaziz International Airport", airportAr: "مطار الملك عبدالله بن عبدالعزيز الدولي" },
  { en: "Yanbu", ar: "ينبع", countryEn: "Saudi Arabia", iata: "YNB", airportEn: "Yanbu International Airport", airportAr: "مطار ينبع الدولي" },
  { en: "Al Ula", ar: "العلا", countryEn: "Saudi Arabia", iata: "ULH", airportEn: "Prince Abdul Majeed bin Abdulaziz International Airport", airportAr: "مطار الأمير عبدالمجيد بن عبدالعزيز الدولي" },
  { en: "Arar", ar: "عرعر", countryEn: "Saudi Arabia", iata: "RAE", airportEn: "Arar Domestic Airport", airportAr: "مطار عرعر" },
  { en: "Sakaka", ar: "سكاكا", countryEn: "Saudi Arabia", iata: "AJF", airportEn: "Al-Jouf International Airport", airportAr: "مطار الجوف الدولي" },
  { en: "Qassim", ar: "القصيم", countryEn: "Saudi Arabia", iata: "ELQ", airportEn: "Prince Naif bin Abdulaziz International Airport", airportAr: "مطار الأمير نايف بن عبدالعزيز الدولي" },
  { en: "Khamis Mushait", ar: "خميس مشيط", countryEn: "Saudi Arabia", iata: "AHB", airportEn: "Abha International Airport", airportAr: "مطار أبها الدولي" },
  { en: "Al Bahah", ar: "الباحة", countryEn: "Saudi Arabia", iata: "ABT", airportEn: "Al-Baha Domestic Airport", airportAr: "مطار الباحة" },
  { en: "Al Kharj", ar: "الخرج", countryEn: "Saudi Arabia" },
  { en: "Hafar Al Batin", ar: "حفر الباطن", countryEn: "Saudi Arabia", iata: "AQI", airportEn: "Al Qaisumah Airport", airportAr: "مطار القيصومة" },
  // ─── GCC & Middle East ───
  { en: "Dubai", ar: "دبي", countryEn: "United Arab Emirates", iata: "DXB", airportEn: "Dubai International Airport", airportAr: "مطار دبي الدولي" },
  { en: "Abu Dhabi", ar: "أبوظبي", countryEn: "United Arab Emirates", iata: "AUH", airportEn: "Zayed International Airport", airportAr: "مطار زايد الدولي" },
  { en: "Sharjah", ar: "الشارقة", countryEn: "United Arab Emirates", iata: "SHJ", airportEn: "Sharjah International Airport", airportAr: "مطار الشارقة الدولي" },
  { en: "Doha", ar: "الدوحة", countryEn: "Qatar", iata: "DOH", airportEn: "Hamad International Airport", airportAr: "مطار حمد الدولي" },
  { en: "Manama", ar: "المنامة", countryEn: "Bahrain", iata: "BAH", airportEn: "Bahrain International Airport", airportAr: "مطار البحرين الدولي" },
  { en: "Kuwait City", ar: "مدينة الكويت", countryEn: "Kuwait", iata: "KWI", airportEn: "Kuwait International Airport", airportAr: "مطار الكويت الدولي" },
  { en: "Muscat", ar: "مسقط", countryEn: "Oman", iata: "MCT", airportEn: "Muscat International Airport", airportAr: "مطار مسقط الدولي" },
  { en: "Salalah", ar: "صلالة", countryEn: "Oman", iata: "SLL", airportEn: "Salalah International Airport", airportAr: "مطار صلالة الدولي" },
  { en: "Amman", ar: "عمّان", countryEn: "Jordan", iata: "AMM", airportEn: "Queen Alia International Airport", airportAr: "مطار الملكة علياء الدولي" },
  { en: "Aqaba", ar: "العقبة", countryEn: "Jordan", iata: "AQJ", airportEn: "King Hussein International Airport", airportAr: "مطار الملك حسين الدولي" },
  { en: "Beirut", ar: "بيروت", countryEn: "Lebanon", iata: "BEY", airportEn: "Beirut–Rafic Hariri International Airport", airportAr: "مطار بيروت رفيق الحريري الدولي" },
  { en: "Damascus", ar: "دمشق", countryEn: "Syria", iata: "DAM", airportEn: "Damascus International Airport", airportAr: "مطار دمشق الدولي" },
  { en: "Baghdad", ar: "بغداد", countryEn: "Iraq", iata: "BGW", airportEn: "Baghdad International Airport", airportAr: "مطار بغداد الدولي" },
  { en: "Erbil", ar: "أربيل", countryEn: "Iraq", iata: "EBL", airportEn: "Erbil International Airport", airportAr: "مطار أربيل الدولي" },
  { en: "Tehran", ar: "طهران", countryEn: "Iran", iata: "IKA", airportEn: "Imam Khomeini International Airport", airportAr: "مطار الإمام الخميني الدولي" },
  { en: "Istanbul", ar: "إسطنبول", countryEn: "Turkey", iata: "IST", airportEn: "Istanbul Airport", airportAr: "مطار إسطنبول" },
  { en: "Ankara", ar: "أنقرة", countryEn: "Turkey", iata: "ESB", airportEn: "Ankara Esenboğa Airport", airportAr: "مطار أنقرة إسنبوغا" },
  { en: "Antalya", ar: "أنطاليا", countryEn: "Turkey", iata: "AYT", airportEn: "Antalya Airport", airportAr: "مطار أنطاليا" },
  { en: "Trabzon", ar: "طرابزون", countryEn: "Turkey", iata: "TZX", airportEn: "Trabzon Airport", airportAr: "مطار طرابزون" },
  { en: "Cairo", ar: "القاهرة", countryEn: "Egypt", iata: "CAI", airportEn: "Cairo International Airport", airportAr: "مطار القاهرة الدولي" },
  { en: "Alexandria", ar: "الإسكندرية", countryEn: "Egypt", iata: "HBE", airportEn: "Borg El Arab International Airport", airportAr: "مطار برج العرب الدولي" },
  { en: "Sharm El Sheikh", ar: "شرم الشيخ", countryEn: "Egypt", iata: "SSH", airportEn: "Sharm El Sheikh International Airport", airportAr: "مطار شرم الشيخ الدولي" },
  { en: "Hurghada", ar: "الغردقة", countryEn: "Egypt", iata: "HRG", airportEn: "Hurghada International Airport", airportAr: "مطار الغردقة الدولي" },
  { en: "Khartoum", ar: "الخرطوم", countryEn: "Sudan", iata: "KRT", airportEn: "Khartoum International Airport", airportAr: "مطار الخرطوم الدولي" },
  { en: "Tunis", ar: "تونس", countryEn: "Tunisia", iata: "TUN", airportEn: "Tunis–Carthage International Airport", airportAr: "مطار تونس قرطاج الدولي" },
  { en: "Algiers", ar: "الجزائر", countryEn: "Algeria", iata: "ALG", airportEn: "Houari Boumediene Airport", airportAr: "مطار هواري بومدين الدولي" },
  { en: "Rabat", ar: "الرباط", countryEn: "Morocco", iata: "RBA", airportEn: "Rabat–Salé Airport", airportAr: "مطار الرباط سلا الدولي" },
  { en: "Casablanca", ar: "الدار البيضاء", countryEn: "Morocco", iata: "CMN", airportEn: "Mohammed V International Airport", airportAr: "مطار محمد الخامس الدولي" },
  { en: "Marrakech", ar: "مراكش", countryEn: "Morocco", iata: "RAK", airportEn: "Marrakesh Menara Airport", airportAr: "مطار مراكش المنارة الدولي" },
  { en: "Tripoli", ar: "طرابلس", countryEn: "Libya", iata: "TIP", airportEn: "Mitiga International Airport", airportAr: "مطار معيتيقة الدولي" },
  { en: "Sanaa", ar: "صنعاء", countryEn: "Yemen", iata: "SAH", airportEn: "Sanaa International Airport", airportAr: "مطار صنعاء الدولي" },
  { en: "Aden", ar: "عدن", countryEn: "Yemen", iata: "ADE", airportEn: "Aden International Airport", airportAr: "مطار عدن الدولي" },
  // ─── South Asia (core Umrah/Hajj origins) ───
  { en: "Karachi", ar: "كراتشي", countryEn: "Pakistan", iata: "KHI", airportEn: "Jinnah International Airport", airportAr: "مطار جناح الدولي" },
  { en: "Lahore", ar: "لاهور", countryEn: "Pakistan", iata: "LHE", airportEn: "Allama Iqbal International Airport", airportAr: "مطار علامة إقبال الدولي" },
  { en: "Islamabad", ar: "إسلام آباد", countryEn: "Pakistan", iata: "ISB", airportEn: "Islamabad International Airport", airportAr: "مطار إسلام آباد الدولي" },
  { en: "Peshawar", ar: "بيشاور", countryEn: "Pakistan", iata: "PEW", airportEn: "Bacha Khan International Airport", airportAr: "مطار باچا خان الدولي" },
  { en: "Multan", ar: "ملتان", countryEn: "Pakistan", iata: "MUX", airportEn: "Multan International Airport", airportAr: "مطار ملتان الدولي" },
  { en: "Faisalabad", ar: "فيصل آباد", countryEn: "Pakistan", iata: "LYP", airportEn: "Faisalabad International Airport", airportAr: "مطار فيصل آباد الدولي" },
  { en: "Sialkot", ar: "سيالكوت", countryEn: "Pakistan", iata: "SKT", airportEn: "Sialkot International Airport", airportAr: "مطار سيالكوت الدولي" },
  { en: "Quetta", ar: "كويتا", countryEn: "Pakistan", iata: "UET", airportEn: "Quetta International Airport", airportAr: "مطار كويته الدولي" },
  { en: "New Delhi", ar: "نيودلهي", countryEn: "India", iata: "DEL", airportEn: "Indira Gandhi International Airport", airportAr: "مطار أنديرا غاندي الدولي" },
  { en: "Mumbai", ar: "مومباي", countryEn: "India", iata: "BOM", airportEn: "Chhatrapati Shivaji Maharaj International Airport", airportAr: "مطار تشاتراباتي شيفاجي ماهراج الدولي" },
  { en: "Hyderabad", ar: "حيدر آباد", countryEn: "India", iata: "HYD", airportEn: "Rajiv Gandhi International Airport", airportAr: "مطار راجيف غاندي الدولي" },
  { en: "Chennai", ar: "تشيناي", countryEn: "India", iata: "MAA", airportEn: "Chennai International Airport", airportAr: "مطار تشيناي الدولي" },
  { en: "Kolkata", ar: "كولكاتا", countryEn: "India", iata: "CCU", airportEn: "Netaji Subhas Chandra Bose International Airport", airportAr: "مطار نيتاجي سوبهاس تشاندرا بوس الدولي" },
  { en: "Bengaluru", ar: "بنغالور", countryEn: "India", iata: "BLR", airportEn: "Kempegowda International Airport", airportAr: "مطار كيمبيغودا الدولي" },
  { en: "Ahmedabad", ar: "أحمد آباد", countryEn: "India", iata: "AMD", airportEn: "Sardar Vallabhbhai Patel International Airport", airportAr: "مطار سردار فالابهباي باتل الدولي" },
  { en: "Kochi", ar: "كوتشي", countryEn: "India", iata: "COK", airportEn: "Cochin International Airport", airportAr: "مطار كوتشين الدولي" },
  { en: "Lucknow", ar: "لكناو", countryEn: "India", iata: "LKO", airportEn: "Chaudhary Charan Singh International Airport", airportAr: "مطار تشودري تشاران سينغ الدولي" },
  { en: "Dhaka", ar: "دكا", countryEn: "Bangladesh", iata: "DAC", airportEn: "Hazrat Shahjalal International Airport", airportAr: "مطار حضرة شاه جلال الدولي" },
  { en: "Chittagong", ar: "شيتاغونغ", countryEn: "Bangladesh", iata: "CGP", airportEn: "Shah Amanat International Airport", airportAr: "مطار شاه أمانات الدولي" },
  { en: "Sylhet", ar: "سيلهيت", countryEn: "Bangladesh", iata: "ZYL", airportEn: "Osmani International Airport", airportAr: "مطار عثماني الدولي" },
  { en: "Colombo", ar: "كولومبو", countryEn: "Sri Lanka", iata: "CMB", airportEn: "Bandaranaike International Airport", airportAr: "مطار بندرنايكا الدولي" },
  { en: "Kathmandu", ar: "كاتماندو", countryEn: "Nepal", iata: "KTM", airportEn: "Tribhuvan International Airport", airportAr: "مطار تريبوفان الدولي" },
  { en: "Male", ar: "ماليه", countryEn: "Maldives", iata: "MLE", airportEn: "Velana International Airport", airportAr: "مطار فيلانا الدولي" },
  { en: "Kabul", ar: "كابول", countryEn: "Afghanistan", iata: "KBL", airportEn: "Kabul International Airport", airportAr: "مطار كابول الدولي" },
  // ─── Southeast & East Asia ───
  { en: "Jakarta", ar: "جاكرتا", countryEn: "Indonesia", iata: "CGK", airportEn: "Soekarno–Hatta International Airport", airportAr: "مطار سوكارنو هاتا الدولي" },
  { en: "Surabaya", ar: "سورابايا", countryEn: "Indonesia", iata: "SUB", airportEn: "Juanda International Airport", airportAr: "مطار جواندا الدولي" },
  { en: "Medan", ar: "ميدان", countryEn: "Indonesia", iata: "KNO", airportEn: "Kualanamu International Airport", airportAr: "مطار كوالانامو الدولي" },
  { en: "Makassar", ar: "ماكاسار", countryEn: "Indonesia", iata: "UPG", airportEn: "Sultan Hasanuddin International Airport", airportAr: "مطار السلطان حسن الدين الدولي" },
  { en: "Kuala Lumpur", ar: "كوالالمبور", countryEn: "Malaysia", iata: "KUL", airportEn: "Kuala Lumpur International Airport", airportAr: "مطار كوالالمبور الدولي" },
  { en: "Penang", ar: "بينانغ", countryEn: "Malaysia", iata: "PEN", airportEn: "Penang International Airport", airportAr: "مطار بينانغ الدولي" },
  { en: "Singapore", ar: "سنغافورة", countryEn: "Singapore", iata: "SIN", airportEn: "Changi Airport", airportAr: "مطار شانغي الدولي" },
  { en: "Bangkok", ar: "بانكوك", countryEn: "Thailand", iata: "BKK", airportEn: "Suvarnabhumi Airport", airportAr: "مطار سوفارنابومي الدولي" },
  { en: "Phuket", ar: "بوكيت", countryEn: "Thailand", iata: "HKT", airportEn: "Phuket International Airport", airportAr: "مطار بوكيت الدولي" },
  { en: "Manila", ar: "مانيلا", countryEn: "Philippines", iata: "MNL", airportEn: "Ninoy Aquino International Airport", airportAr: "مطار نينوي أكينو الدولي" },
  { en: "Beijing", ar: "بكين", countryEn: "China", iata: "PEK", airportEn: "Beijing Capital International Airport", airportAr: "مطار بكين العاصمة الدولي" },
  { en: "Shanghai", ar: "شنغهاي", countryEn: "China", iata: "PVG", airportEn: "Shanghai Pudong International Airport", airportAr: "مطار شنغهاي بودنغ الدولي" },
  { en: "Guangzhou", ar: "قوانغتشو", countryEn: "China", iata: "CAN", airportEn: "Guangzhou Baiyun International Airport", airportAr: "مطار قوانغتشو بايون الدولي" },
  { en: "Hong Kong", ar: "هونغ كونغ", countryEn: "China", iata: "HKG", airportEn: "Hong Kong International Airport", airportAr: "مطار هونغ كونغ الدولي" },
  { en: "Tokyo", ar: "طوكيو", countryEn: "Japan", iata: "NRT", airportEn: "Narita International Airport", airportAr: "مطار ناريتا الدولي" },
  { en: "Osaka", ar: "أوساكا", countryEn: "Japan", iata: "KIX", airportEn: "Kansai International Airport", airportAr: "مطار كانساي الدولي" },
  { en: "Seoul", ar: "سيول", countryEn: "South Korea", iata: "ICN", airportEn: "Incheon International Airport", airportAr: "مطار إنتشون الدولي" },
  { en: "Taipei", ar: "تايبيه", countryEn: "Taiwan", iata: "TPE", airportEn: "Taiwan Taoyuan International Airport", airportAr: "مطار تاويوان الدولي" },
  // ─── Central Asia ───
  { en: "Tashkent", ar: "طشقند", countryEn: "Uzbekistan", iata: "TAS", airportEn: "Tashkent International Airport", airportAr: "مطار طشقند الدولي" },
  { en: "Samarkand", ar: "سمرقند", countryEn: "Uzbekistan", iata: "SKD", airportEn: "Samarkand International Airport", airportAr: "مطار سمرقند الدولي" },
  { en: "Bukhara", ar: "بخارى", countryEn: "Uzbekistan", iata: "BHK", airportEn: "Bukhara International Airport", airportAr: "مطار بخارى الدولي" },
  { en: "Almaty", ar: "ألماتي", countryEn: "Kazakhstan", iata: "ALA", airportEn: "Almaty International Airport", airportAr: "مطار ألماتي الدولي" },
  { en: "Astana", ar: "أستانا", countryEn: "Kazakhstan", iata: "NQZ", airportEn: "Nursultan Nazarbayev International Airport", airportAr: "مطار نور سلطان نزارباييف الدولي" },
  { en: "Bishkek", ar: "بيشكيك", countryEn: "Kyrgyzstan", iata: "FRU", airportEn: "Manas International Airport", airportAr: "مطار مناس الدولي" },
  { en: "Dushanbe", ar: "دوشنبه", countryEn: "Tajikistan", iata: "DYU", airportEn: "Dushanbe International Airport", airportAr: "مطار دوشنبه الدولي" },
  { en: "Ashgabat", ar: "عشق آباد", countryEn: "Turkmenistan", iata: "ASB", airportEn: "Ashgabat International Airport", airportAr: "مطار عشق آباد الدولي" },
  { en: "Baku", ar: "باكو", countryEn: "Azerbaijan", iata: "GYD", airportEn: "Heydar Aliyev International Airport", airportAr: "مطار حيدر علييف الدولي" },
  // ─── Africa ───
  { en: "Addis Ababa", ar: "أديس أبابا", countryEn: "Ethiopia", iata: "ADD", airportEn: "Addis Ababa Bole International Airport", airportAr: "مطار أديس أبابا بولي الدولي" },
  { en: "Nairobi", ar: "نيروبي", countryEn: "Kenya", iata: "NBO", airportEn: "Jomo Kenyatta International Airport", airportAr: "مطار جومو كينياتا الدولي" },
  { en: "Mombasa", ar: "مومباسا", countryEn: "Kenya", iata: "MBA", airportEn: "Moi International Airport", airportAr: "مطار موي الدولي" },
  { en: "Dar es Salaam", ar: "دار السلام", countryEn: "Tanzania", iata: "DAR", airportEn: "Julius Nyerere International Airport", airportAr: "مطار جوليوس نيريري الدولي" },
  { en: "Zanzibar", ar: "زنجبار", countryEn: "Tanzania", iata: "ZNZ", airportEn: "Abeid Amani Karume International Airport", airportAr: "مطار عبيد أماني كارومي الدولي" },
  { en: "Entebbe", ar: "عنتيبي", countryEn: "Uganda", iata: "EBB", airportEn: "Entebbe International Airport", airportAr: "مطار عنتيبي الدولي" },
  { en: "Dakar", ar: "داكار", countryEn: "Senegal", iata: "DSS", airportEn: "Blaise Diagne International Airport", airportAr: "مطار بليز دياني الدولي" },
  { en: "Bamako", ar: "باماكو", countryEn: "Mali", iata: "BKO", airportEn: "Modibo Keita International Airport", airportAr: "مطار موديبو كيتا الدولي" },
  { en: "Abidjan", ar: "أبيدجان", countryEn: "Ivory Coast", iata: "ABJ", airportEn: "Félix-Houphouët-Boigny International Airport", airportAr: "مطار فيليكس هوفويت بوانيي الدولي" },
  { en: "Accra", ar: "أكرا", countryEn: "Ghana", iata: "ACC", airportEn: "Kotoka International Airport", airportAr: "مطار كوتوكا الدولي" },
  { en: "Lagos", ar: "لاغوس", countryEn: "Nigeria", iata: "LOS", airportEn: "Murtala Muhammed International Airport", airportAr: "مطار مرتلا محمد الدولي" },
  { en: "Abuja", ar: "أبوجا", countryEn: "Nigeria", iata: "ABV", airportEn: "Nnamdi Azikiwe International Airport", airportAr: "مطار نامدي أزيكيوي الدولي" },
  { en: "Kano", ar: "كانو", countryEn: "Nigeria", iata: "KAN", airportEn: "Mallam Aminu Kano International Airport", airportAr: "مطار ملام أمينو كانو الدولي" },
  { en: "Niamey", ar: "نيامي", countryEn: "Niger", iata: "NIM", airportEn: "Diori Hamani International Airport", airportAr: "مطار ديوري حماني الدولي" },
  { en: "Johannesburg", ar: "جوهانسبرغ", countryEn: "South Africa", iata: "JNB", airportEn: "O. R. Tambo International Airport", airportAr: "مطار أوليفر ريجنالد تامبو الدولي" },
  { en: "Cape Town", ar: "كيب تاون", countryEn: "South Africa", iata: "CPT", airportEn: "Cape Town International Airport", airportAr: "مطار كيب تاون الدولي" },
  { en: "Mogadishu", ar: "مقديشو", countryEn: "Somalia", iata: "MGQ", airportEn: "Aden Adde International Airport", airportAr: "مطار آدم عدي الدولي" },
  { en: "Djibouti City", ar: "جيبوتي", countryEn: "Djibouti", iata: "JIB", airportEn: "Djibouti–Ambouli International Airport", airportAr: "مطار جيبوتي أمبولي الدولي" },
  { en: "Moroni", ar: "موروني", countryEn: "Comoros", iata: "HAH", airportEn: "Prince Said Ibrahim International Airport", airportAr: "مطار الأمير سعيد إبراهيم الدولي" },
  // ─── Europe ───
  { en: "London", ar: "لندن", countryEn: "United Kingdom", iata: "LHR", airportEn: "Heathrow Airport", airportAr: "مطار هيثرو" },
  { en: "Manchester", ar: "مانشستر", countryEn: "United Kingdom", iata: "MAN", airportEn: "Manchester Airport", airportAr: "مطار مانشستر" },
  { en: "Birmingham", ar: "برمنغهام", countryEn: "United Kingdom", iata: "BHX", airportEn: "Birmingham Airport", airportAr: "مطار برمنغهام" },
  { en: "Paris", ar: "باريس", countryEn: "France", iata: "CDG", airportEn: "Charles de Gaulle Airport", airportAr: "مطار شارل ديغول" },
  { en: "Nice", ar: "نيس", countryEn: "France", iata: "NCE", airportEn: "Nice Côte d'Azur Airport", airportAr: "مطار نيس كوت دازور" },
  { en: "Frankfurt", ar: "فرانكفورت", countryEn: "Germany", iata: "FRA", airportEn: "Frankfurt Airport", airportAr: "مطار فرانكفورت" },
  { en: "Berlin", ar: "برلين", countryEn: "Germany", iata: "BER", airportEn: "Berlin Brandenburg Airport", airportAr: "مطار برلين براندنبورغ" },
  { en: "Munich", ar: "ميونخ", countryEn: "Germany", iata: "MUC", airportEn: "Munich Airport", airportAr: "مطار ميونخ" },
  { en: "Amsterdam", ar: "أمستردام", countryEn: "Netherlands", iata: "AMS", airportEn: "Amsterdam Airport Schiphol", airportAr: "مطار أمستردام سخيبول" },
  { en: "Brussels", ar: "بروكسل", countryEn: "Belgium", iata: "BRU", airportEn: "Brussels Airport", airportAr: "مطار بروكسل" },
  { en: "Madrid", ar: "مدريد", countryEn: "Spain", iata: "MAD", airportEn: "Adolfo Suárez Madrid–Barajas Airport", airportAr: "مطار مدريد باراخاس الدولي" },
  { en: "Barcelona", ar: "برشلونة", countryEn: "Spain", iata: "BCN", airportEn: "Josep Tarradellas Barcelona–El Prat Airport", airportAr: "مطار برشلونة إل برات الدولي" },
  { en: "Rome", ar: "روما", countryEn: "Italy", iata: "FCO", airportEn: "Leonardo da Vinci–Fiumicino Airport", airportAr: "مطار ليوناردو دافنشي فيوميتشينو" },
  { en: "Milan", ar: "ميلانو", countryEn: "Italy", iata: "MXP", airportEn: "Milan Malpensa Airport", airportAr: "مطار ميلانو مالبينسا" },
  { en: "Vienna", ar: "فيينا", countryEn: "Austria", iata: "VIE", airportEn: "Vienna International Airport", airportAr: "مطار فيينا الدولي" },
  { en: "Zurich", ar: "زيورخ", countryEn: "Switzerland", iata: "ZRH", airportEn: "Zurich Airport", airportAr: "مطار زيورخ" },
  { en: "Athens", ar: "أثينا", countryEn: "Greece", iata: "ATH", airportEn: "Athens International Airport", airportAr: "مطار أثينا الدولي" },
  { en: "Stockholm", ar: "ستوكهولم", countryEn: "Sweden", iata: "ARN", airportEn: "Stockholm Arlanda Airport", airportAr: "مطار ستوكهولم ألاندا" },
  { en: "Oslo", ar: "أوسلو", countryEn: "Norway", iata: "OSL", airportEn: "Oslo Airport Gardermoen", airportAr: "مطار أوسلو غاردرموين" },
  { en: "Copenhagen", ar: "كوبنهاغن", countryEn: "Denmark", iata: "CPH", airportEn: "Copenhagen Airport", airportAr: "مطار كوبنهاغن" },
  { en: "Dublin", ar: "دبلن", countryEn: "Ireland", iata: "DUB", airportEn: "Dublin Airport", airportAr: "مطار دبلن" },
  { en: "Lisbon", ar: "لشبونة", countryEn: "Portugal", iata: "LIS", airportEn: "Humberto Delgado Airport", airportAr: "مطار لشبونة" },
  { en: "Moscow", ar: "موسكو", countryEn: "Russia", iata: "SVO", airportEn: "Sheremetyevo International Airport", airportAr: "مطار شيريميتييفو الدولي" },
  { en: "Sarajevo", ar: "سراييفو", countryEn: "Bosnia and Herzegovina", iata: "SJJ", airportEn: "Sarajevo International Airport", airportAr: "مطار سراييفو الدولي" },
  { en: "Pristina", ar: "بريشتينا", countryEn: "Kosovo", iata: "PRN", airportEn: "Pristina International Airport Adem Jashari", airportAr: "مطار بريشتينا الدولي" },
  { en: "Tirana", ar: "تيرانا", countryEn: "Albania", iata: "TIA", airportEn: "Tirana International Airport Nënë Tereza", airportAr: "مطار تيرانا الدولي" },
  { en: "Skopje", ar: "سكوبيه", countryEn: "North Macedonia", iata: "SKP", airportEn: "Skopje International Airport", airportAr: "مطار سكوبيه الدولي" },
  // ─── Americas & Oceania ───
  { en: "New York", ar: "نيويورك", countryEn: "United States", iata: "JFK", airportEn: "John F. Kennedy International Airport", airportAr: "مطار جون إف كينيدي الدولي" },
  { en: "Los Angeles", ar: "لوس أنجلوس", countryEn: "United States", iata: "LAX", airportEn: "Los Angeles International Airport", airportAr: "مطار لوس أنجلوس الدولي" },
  { en: "Chicago", ar: "شيكاغو", countryEn: "United States", iata: "ORD", airportEn: "O'Hare International Airport", airportAr: "مطار أوهير الدولي" },
  { en: "Houston", ar: "هيوستن", countryEn: "United States", iata: "IAH", airportEn: "George Bush Intercontinental Airport", airportAr: "مطار جورج بوش الدولي" },
  { en: "Washington", ar: "واشنطن", countryEn: "United States", iata: "IAD", airportEn: "Washington Dulles International Airport", airportAr: "مطار واشنطن دالاس الدولي" },
  { en: "Toronto", ar: "تورونتو", countryEn: "Canada", iata: "YYZ", airportEn: "Toronto Pearson International Airport", airportAr: "مطار تورونتو بيرسون الدولي" },
  { en: "Montreal", ar: "مونتريال", countryEn: "Canada", iata: "YUL", airportEn: "Montréal–Trudeau International Airport", airportAr: "مطار مونتريال ترودو الدولي" },
  { en: "Vancouver", ar: "فانكوفر", countryEn: "Canada", iata: "YVR", airportEn: "Vancouver International Airport", airportAr: "مطار فانكوفر الدولي" },
  { en: "Mexico City", ar: "مكسيكو سيتي", countryEn: "Mexico", iata: "MEX", airportEn: "Mexico City International Airport", airportAr: "مطار مكسيكو سيتي الدولي" },
  { en: "São Paulo", ar: "ساو باولو", countryEn: "Brazil", iata: "GRU", airportEn: "São Paulo/Guarulhos International Airport", airportAr: "مطار ساو باولو غوارولوس الدولي" },
  { en: "Buenos Aires", ar: "بوينس آيرس", countryEn: "Argentina", iata: "EZE", airportEn: "Ministro Pistarini International Airport", airportAr: "مطار بوينس آيرس الدولي" },
  { en: "Sydney", ar: "سيدني", countryEn: "Australia", iata: "SYD", airportEn: "Sydney Kingsford Smith Airport", airportAr: "مطار سيدني الدولي" },
  { en: "Melbourne", ar: "ملبورن", countryEn: "Australia", iata: "MEL", airportEn: "Melbourne Airport", airportAr: "مطار ملبورن" },
  { en: "Perth", ar: "بيرث", countryEn: "Australia", iata: "PER", airportEn: "Perth Airport", airportAr: "مطار بيرث" },
  { en: "Auckland", ar: "أوكلاند", countryEn: "New Zealand", iata: "AKL", airportEn: "Auckland Airport", airportAr: "مطار أوكلاند" },
];

/**
 * Display label for a city option: "City — Airport Name (IATA)" when airport
 * data is known, else falls back to "City (Country)".
 */
export function cityLabel(c: City, lang: "en" | "ar"): string {
  if (lang === "ar") {
    return c.airportAr ? `${c.ar} — ${c.airportAr} (${c.iata})` : `${c.ar} (${c.en})`;
  }
  return c.airportEn ? `${c.en} — ${c.airportEn} (${c.iata})` : `${c.en} (${c.countryEn})`;
}

export function findCity(en: string | null | undefined): City | undefined {
  if (!en) return undefined;
  return CITIES.find((c) => c.en === en);
}
