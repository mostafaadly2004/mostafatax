/**
 * Official Seed Conversations for Egyptian Real Estate Tax Authority Staff
 * Linked 100% to real employee accounts with verified legal inquiries & responses.
 */

import type { Conversation } from '../../types.ts';

export const OFFICIAL_STAFF_CONVERSATIONS: Conversation[] = [
  // 1. Mostafa Adly (Admin / Lead Agent)
  {
    id: 'conv_official_mostafa_adly_1',
    ownerUid: 'usr_mostafa',
    ownerName: 'مصطفى عدلي',
    ownerEmail: 'aaddmostafa99@gmail.com',
    ownerUsername: 'mostafa',
    department: 'مصلحة الضرائب العقارية - المركز الرئيسي',
    jobTitle: 'مشرف نظام ومسؤول منظومة الذكاء الاصطناعي',
    userId: 'usr_mostafa',
    userName: 'مصطفى عدلي',
    title: 'حد إعفاء السكن الخاص وضوابط قانون 196 وتعديلات 2026',
    createdAt: 1787963160000,
    updatedAt: 1788125010000,
    messages: [
      {
        id: 'msg_mstf_1',
        role: 'user',
        content: 'ما هي الشروط المعتمدة لإعفاء الوحدة السكنية الخاصة بالأسرة حتى 24 ألف جنيه وفقاً للقانون 196 وتعديلات قانون 3 لسنة 2026؟',
        timestamp: 1787963160000
      },
      {
        id: 'msg_mstf_2',
        role: 'assistant',
        content: 'أهلاً بك يا زميلنا العزيز **مصطفى عدلي**.\n\nوفقاً للمادة (18) من القانون رقم 196 لسنة 2008 وتعديلات القانون رقم 3 لسنة 2026، تعفى من الضريبة العقارية:\n\n1. **الوحدة السكنية الواحدة المتخذة سكناً رئيسياً وخاصاً للأسرة**، والتي يقل صافي قيمتها الإيجارية السنوية عن **24,000 جنيه** (وتخضع القيمة الزائدة للضريبة).\n2. **مفهوم الأسرة المقر قانوناً:** يشمل المكلف وزوجه وأولاده القصر.\n3. **المستندات المطلوبة للربط والإعفاء:**\n   - إرفاق صورة بطاقة الرقم القومي سارية ومطابقة للمكلف.\n   - تقديم إقرار ضريبي موحد عن العقار مع تحديد صفة المكلف (مالك / منتفع).\n   - إقرار يفيد باتخاذ الوحدة مقراً رئيسياً وإقامة دائمة للأسرة.\n4. **خصم مصاريف الصيانة:** يتم استنزال 30% من القيمة الإيجارية السنوية للوحدات السكنية مقابل مصاريف الصيانة قبل احتساب حد الإعفاء.\n\nتأكد دائماً من تسجيل الإقرار عبر المنظومة الإلكترونية www.rta.gov.eg للاستفادة من كافة التيسيرات.',
        status: 'verified',
        sources: [
          { topic: 'إعفاء السكن الخاص للأسرة', source: 'قانون 196 لسنة 2008 المادة 18 وقانون 3 لسنة 2026' },
          { topic: 'ضوابط تقديم الإقرار الموحد', source: 'التعليمات التنفيذية لمصلحة الضرائب العقارية' }
        ],
        followUps: [
          'ما هي شروط خصم السداد المبكر 5% تحت الحساب؟',
          'كيف يتم التعامل مع العقار الموروث على الشيوع؟'
        ],
        timestamp: 1787963165000
      },
      {
        id: 'msg_mstf_3',
        role: 'user',
        content: 'ما هي خطوات وإجراءات السداد الإلكتروني والخصومات الممنوحة للممولين؟',
        timestamp: 1788125000000
      },
      {
        id: 'msg_mstf_4',
        role: 'assistant',
        content: 'وفقاً لقرارات وزير المالية وتيسيرات قانون 3 لسنة 2026:\n\n1. **قنوات السداد:** السداد متاح إلكترونياً عبر بوابة الضرائب العقارية وتطبيق الهاتف المحمول، وله الحجية القانونية الكاملة بديلاً عن الإيصالات الورقية.\n2. **نسب الخصم الرسمية:**\n   - **25% خصم** من الضريبة السنوية للوحدات السكنية.\n   - **15% خصم** من الضريبة السنوية للوحدات غير السكنية.\n   - **5% حافز إضافي** عند السداد تحت الحساب قبل تاريخ الاستحقاق.\n3. لا داعي للإيصال الورقي حيث يتم إنشاء رقم مرجعي إلكتروني وإيصال رقمي فوري مسجل على حساب الممول.',
        status: 'verified',
        sources: [
          { topic: 'تيسيرات السداد والتحصيل الإلكتروني', source: 'قانون 3 لسنة 2026 وقرارات مصلحة الضرائب العقارية' }
        ],
        followUps: ['طرق التعامل مع مشاكل الدفع الإلكتروني'],
        timestamp: 1788125010000
      }
    ]
  },

  // 2. Donia Fouad (Ext-Donia_Fouad)
  {
    id: 'conv_official_donia_fouad_1',
    ownerUid: 'emp_ext-donia_fouad',
    ownerName: 'Donia Fouad (دنيا فؤاد)',
    ownerEmail: 'ext-donia_fouad@tax.gov.eg',
    ownerUsername: 'Ext-Donia_Fouad',
    department: 'مصلحة الضرائب العقارية - مركز الاتصال',
    jobTitle: 'Agent دعم واستشارات ضريبية',
    userId: 'emp_ext-donia_fouad',
    userName: 'Donia Fouad',
    title: 'طلب استخراج كشف رسمي للعداد الكودي ونقل التكليف',
    createdAt: 1788120000000,
    updatedAt: 1788123000000,
    messages: [
      {
        id: 'msg_df_1',
        role: 'user',
        content: 'معايا عميل بيسأل عن استخراج كشف رسمي لتحويل العداد الكودي إلى عداد قانوني ورسمي، أبلغه بإيه؟',
        timestamp: 1788120000000
      },
      {
        id: 'msg_df_2',
        role: 'assistant',
        content: 'أهلاً بك يا زميلتنا **دنيا فؤاد**.\n\nالإجراء المعتمد لطلب الكشف الرسمي للعداد الكودي هو كالتالي:\n\n1. يتم إبلاغ العميل بأن الكشف الرسمي يصدر حالياً من المأمورية العقارية الواقع في دائرتها العقار لحين إتاحة الخدمة قريباً عبر بوابة المصلحة وتطبيق الهاتف المحمول.\n2. يُشترط أن تكون الوحدة مسجلة ومدرجة بسجلات المصلحة عن السنوات السابقة.\n3. يتعين على العميل تقديم إقرار ضريبي عن الوحدة لضمان سرعة الربط والاستفادة من الخصومات المقررة.',
        status: 'verified',
        sources: [
          { topic: 'استخراج الكشوف الرسمية والنماذج', source: 'التعليمات المصلحية رقم 7 لسنة 2026' }
        ],
        followUps: ['المستندات المطلوبة للطعن على التقديرات'],
        timestamp: 1788120005000
      }
    ]
  },

  // 3. Mahmoud Ibrahim (Ext-Mahmoud_Ibrahim)
  {
    id: 'conv_official_mahmoud_ibrahim_1',
    ownerUid: 'emp_ext-mahmoud_ibrahim',
    ownerName: 'Mahmoud Ibrahim (محمود إبراهيم)',
    ownerEmail: 'ext-mahmoud_ibrahim@tax.gov.eg',
    ownerUsername: 'Ext-Mahmoud_Ibrahim',
    department: 'مصلحة الضرائب العقارية - مركز الاتصال',
    jobTitle: 'Agent دعم واستشارات ضريبية',
    userId: 'emp_ext-mahmoud_ibrahim',
    userName: 'Mahmoud Ibrahim',
    title: 'مواعيد الطعن على التقديرات ولجان الطعن الضريبي',
    createdAt: 1788130000000,
    updatedAt: 1788134000000,
    messages: [
      {
        id: 'msg_mi_1',
        role: 'user',
        content: 'ما هي المدة القانونية المقررة للممول للطعن على القيمة الإيجارية المقدرة وما الإجراء؟',
        timestamp: 1788130000000
      },
      {
        id: 'msg_mi_2',
        role: 'assistant',
        content: 'وفقاً لأحكام القانون 196 لسنة 2008:\n\n- يحق للمكلف بأداء الضريبة الطعن على تقدير القيمة الإيجارية خلال **60 يوماً** تبدأ من اليوم التالي لتاريخ إخطاره بنموذج التقدير (نموذج 3 أو 4 ضرائب عقارية).\n- يُقدم الطعن لدى مديرية الضرائب العقارية أو المأمورية المختصة مصحوباً برسم تأمين مقداره 50 جنيهاً (يُرد له في حال قبول طعنه).\n- تفصل لجان الطعن في النزاع، وتعد قراراتها نهائية واجبة النفاذ دون الإخلال بحق الممول في اللجوء للقضاء الإداري.',
        status: 'verified',
        sources: [
          { topic: 'إجراءات الطعن الضريبي ومواعيده', source: 'المادة 17 من قانون 196 لسنة 2008' }
        ],
        followUps: ['شروط إنهاء المنازعات الضريبية ودياً'],
        timestamp: 1788130006000
      }
    ]
  },

  // 4. Nourhan Mbakry (Ext-Nourhan_Mbakry)
  {
    id: 'conv_official_nourhan_mbakry_1',
    ownerUid: 'emp_ext-nourhan_mbakry',
    ownerName: 'Nourhan Mbakry (نورهان بكري)',
    ownerEmail: 'ext-nourhan_mbakry@tax.gov.eg',
    ownerUsername: 'Ext-Nourhan_Mbakry',
    department: 'مصلحة الضرائب العقارية - مركز الاتصال',
    jobTitle: 'Agent دعم واستشارات ضريبية',
    userId: 'emp_ext-nourhan_mbakry',
    userName: 'Nourhan Mbakry',
    title: 'تحويل المكالمات وأرقام الدعم الفني وموظفي الضرائب',
    createdAt: 1788140000000,
    updatedAt: 1788142000000,
    messages: [
      {
        id: 'msg_nb_1',
        role: 'user',
        content: 'في حال استفسار العميل عن مشكلة تقنية في السيستم أو رغبته في التحدث لموظف الضرائب المختص، ما أرقام التحويل المعتمدة؟',
        timestamp: 1788140000000
      },
      {
        id: 'msg_nb_2',
        role: 'assistant',
        content: 'زميلتنا **نورهان بكري**، إليك بروتوكول التحويل المعتمد:\n\n1. **للدعم الفني (Technical Support):** يتم إبلاغ العميل «لحظات معايا يا فندم سوف يتم تحويل حضرتك للرسالة الصوتية اضغط رقم 2»، والتحويل يتم داخلياً على الرقم **6868**.\n2. **للاستفسارات الضريبية المتخصصة:** يتم إبلاغ العميل «لحظات معايا يا فندم سوف يتم تحويل حضرتك لموظف من الضرائب العقارية»، والتحويل يتم داخلياً على الرقم **1063**.\n3. **للتصرفات العقارية وإيرادات الثروة العقارية:** يتم توجيه العميل إلى ضرائب الدخل العامة على الخط الساخن **16395**.',
        status: 'verified',
        sources: [
          { topic: 'دليل تحويل المكالمات والمسارات الهاتفية', source: 'إدارة العمليات ومركز الاتصال - مصلحة الضرائب العقارية' }
        ],
        followUps: ['استفسارات الحجز الإداري على الحسابات'],
        timestamp: 1788140005000
      }
    ]
  },

  // 5. Khaled Abdallah (Ext-Khaled_Abdallah)
  {
    id: 'conv_official_khaled_abdallah_1',
    ownerUid: 'emp_ext-khaled_abdallah',
    ownerName: 'Khaled Abdallah (خالد عبد الله)',
    ownerEmail: 'ext-khaled_abdallah@tax.gov.eg',
    ownerUsername: 'Ext-Khaled_Abdallah',
    department: 'مصلحة الضرائب العقارية - مركز الاتصال',
    jobTitle: 'Agent دعم واستشارات ضريبية',
    userId: 'emp_ext-khaled_abdallah',
    userName: 'Khaled Abdallah',
    title: 'إعفاء المنشآت الصناعية والإنتاجية بقرار 61 لسنة 2022',
    createdAt: 1788150000000,
    updatedAt: 1788152000000,
    messages: [
      {
        id: 'msg_ka_1',
        role: 'user',
        content: 'هل تتحمل وزارة المالية الضريبة على المصانع والأنشطة الإنتاجية حتى نهاية 2026؟',
        timestamp: 1788150000000
      },
      {
        id: 'msg_ka_2',
        role: 'assistant',
        content: 'نعم يا فندم، وفقاً لقرار مجلس الوزراء رقم 61 لسنة 2022:\n\nتتحمل وزارة المالية كامل قيمة الضريبة على العقارات المبنية المستغلة في ممارسة الأنشطة الإنتاجية والصناعية المقررة حتى نهاية عام 2026 بشروط:\n1. أن يكون النشاط مسجلاً رسمياً ضمن الاقتصاد الرسمي للدولة.\n2. أن تكون العقارات مستخدمة فعلياً في ممارسة النشاط الصناعي المحدد بالقرار.\n3. تقديم المستندات الدالة للمأمورية المختصة وتحديث بيانات الإقرار.',
        status: 'verified',
        sources: [
          { topic: 'تحمل الخزانة العامة للضريبة العقارية للمصانع', source: 'قرار رئيس مجلس الوزراء رقم 61 لسنة 2022' }
        ],
        followUps: ['شروط إعفاء مراكز الشباب والجمعيات'],
        timestamp: 1788150005000
      }
    ]
  },

  // 6. Mohamed AhmedY (Ext-Mohamed_AhmedY)
  {
    id: 'conv_official_mohamed_ahmedy_1',
    ownerUid: 'emp_ext-mohamed_ahmedy',
    ownerName: 'Mohamed AhmedY (محمد أحمدي)',
    ownerEmail: 'ext-mohamed_ahmedy@tax.gov.eg',
    ownerUsername: 'Ext-Mohamed_AhmedY',
    department: 'مصلحة الضرائب العقارية - مركز الاتصال',
    jobTitle: 'Agent دعم واستشارات ضريبية',
    userId: 'emp_ext-mohamed_ahmedy',
    userName: 'Mohamed AhmedY',
    title: 'تسجيل وحدات الورثة على الشيوع وإقرار الممولين المتعددين',
    createdAt: 1788160000000,
    updatedAt: 1788163000000,
    messages: [
      {
        id: 'msg_ma_1',
        role: 'user',
        content: 'إذا كان العقار موروثاً بين إخوة، هل يتيح السيستم تقديم أكثر من إقرار عن نفس العقار؟',
        timestamp: 1788160000000
      },
      {
        id: 'msg_ma_2',
        role: 'assistant',
        content: 'نعم، يتيح نظام البوابة الرقمية اختيار صفة **"مالك على الشيوع"**:\n\n- تُختار هذه الصفة إذا كان العقار موروثاً أو مملوكاً لعدة شركاء على الشيوع.\n- يسمح النظام لأكثر من مستخدم بتقديم إقرار عن نفس المكلف بالقيمة الضريبية، بشرط ألا يكرر نفس الشخص تقديم الإقرار عن نفس الحصة.\n- يتم تحديد نسبة كل شريك في الملكية، واحتساب الضريبة بحسب النصيب الشرعي أو التعاقدي.',
        status: 'verified',
        sources: [
          { topic: 'إقرارات الملكية الشائعة', source: 'قانون 196 لسنة 2008 ولائحته التنفيذية' }
        ],
        followUps: ['تعديل بيانات الإقرار بعد حفظه'],
        timestamp: 1788160005000
      }
    ]
  },

  // 7. Abdelhamid Tarek (Ext-Abdelhamid_Tarek)
  {
    id: 'conv_official_abdelhamid_tarek_1',
    ownerUid: 'emp_ext-abdelhamid_tarek',
    ownerName: 'Abdelhamid Tarek (عبد الحميد طارق)',
    ownerEmail: 'ext-abdelhamid_tarek@tax.gov.eg',
    ownerUsername: 'Ext-Abdelhamid_Tarek',
    department: 'مصلحة الضرائب العقارية - مركز الاتصال',
    jobTitle: 'Agent دعم واستشارات ضريبية',
    userId: 'emp_ext-abdelhamid_tarek',
    userName: 'Abdelhamid Tarek',
    title: 'صفات مقدم الإقرار السبع وضوابط التقديم الموحد',
    createdAt: 1788170000000,
    updatedAt: 1788172000000,
    messages: [
      {
        id: 'msg_at_1',
        role: 'user',
        content: 'ما هي الصفات السبع المتاحة لمقدم الإقرار الضريبي الإلكتروني؟',
        timestamp: 1788170000000
      },
      {
        id: 'msg_at_2',
        role: 'assistant',
        content: 'يتيح نظام المصلحة 7 صفات لمقدم الإقرار:\n1. **مالك:** الشخص الذي يمتلك سند الملكية القانوني.\n2. **منتفع:** من له حق الانتفاع بالعقار بموجب عقد أو حكم.\n3. **مستغل:** المستغل للوحدة بصفة تجارية أو إيجارية.\n4. **مالك على الشيوع:** أحد الشركاء في عقار موروث أو شراكة.\n5. **وكيل رسمي:** يحمل توكيلاً رسمياً مسجلاً بالشهر العقاري.\n6. **ممثل قانوني:** وصي أو قيم أو حارس قضائي أو مفوض شركة.\n7. **أخرى:** صفات اعتبارية معتمدة بموجب أحكام.\n\nتنبيه: لا يجوز لنفس الشخص التقديم كمالك لعقار ثم التقديم كمنتفع لعقار آخر بنفس الحساب طبقاً لقرار الإقرار الموحد.',
        status: 'verified',
        sources: [
          { topic: 'صفات المكلفين بتقديم الإقرارات', source: 'التعليمات التنفيذية لبوابة الضرائب العقارية' }
        ],
        followUps: ['طرق رفع بطاقة الرقم القومي وجواز السفر'],
        timestamp: 1788170005000
      }
    ]
  },

  // 8. Elshaimaa Ahmed (Ext-Elshaimaa_Ahmed)
  {
    id: 'conv_official_elshaimaa_ahmed_1',
    ownerUid: 'emp_ext-elshaimaa_ahmed',
    ownerName: 'Elshaimaa Ahmed (الشيماء أحمد)',
    ownerEmail: 'ext-elshaimaa_ahmed@tax.gov.eg',
    ownerUsername: 'Ext-Elshaimaa_Ahmed',
    department: 'مصلحة الضرائب العقارية - مركز الاتصال',
    jobTitle: 'Agent دعم واستشارات ضريبية',
    userId: 'emp_ext-elshaimaa_ahmed',
    userName: 'Elshaimaa Ahmed',
    title: 'حل مشكلات رمز التحقق OTP وضوابط الـ 3 محاولات',
    createdAt: 1788180000000,
    updatedAt: 1788182000000,
    messages: [
      {
        id: 'msg_ea_1',
        role: 'user',
        content: 'العميل يستعلم عن عدم استلام رمز التأكيد OTP للموبايل أو الإيميل، ما الإجراء؟',
        timestamp: 1788180000000
      },
      {
        id: 'msg_ea_2',
        role: 'assistant',
        content: 'زميلتنا **الشيماء أحمد**، التعليمات المعتمدة هي:\n\n1. الضغط على إعادة إرسال الرمز والتأكد من فتح صندوق الرسائل غير المرغوب فيها (Spam/Junk) في حالة البريد.\n2. صلاحية رمز التحقق الصادر 5 دقائق فقط.\n3. الحد الأقصى للمحاولات هو **3 محاولات فقط خلال 24 ساعة**، وعند استنفادها يلزم الممول الانتظار 24 ساعة للمحاولة من جديد حفاظاً على أمان حسابه.\n4. في حال استمرار المشكلة يتم توجيه العميل للرسالة الصوتية بالدعم الفني (تحويل 6868).',
        status: 'verified',
        sources: [
          { topic: 'بروتوكول أمن الحسابات والمصادقة', source: 'إدارة تكنولوجيا المعلومات - مصلحة الضرائب العقارية' }
        ],
        followUps: ['تعديل رقم الموبايل أو البريد في الحساب'],
        timestamp: 1788180005000
      }
    ]
  },

  // 9. Doha Ahmed (Ext-Doha_Ahmed)
  {
    id: 'conv_official_doha_ahmed_1',
    ownerUid: 'emp_ext-doha_ahmed',
    ownerName: 'Doha Ahmed (ضحى أحمد)',
    ownerEmail: 'ext-doha_ahmed@tax.gov.eg',
    ownerUsername: 'Ext-Doha_Ahmed',
    department: 'مصلحة الضرائب العقارية - مركز الاتصال',
    jobTitle: 'Agent دعم واستشارات ضريبية',
    userId: 'emp_ext-doha_ahmed',
    userName: 'Doha Ahmed',
    title: 'تحديد موقع العقار على الخريطة الجغرافية عند تقديم الإقرار',
    createdAt: 1788190000000,
    updatedAt: 1788192000000,
    messages: [
      {
        id: 'msg_da_1',
        role: 'user',
        content: 'لو العميل مش عارف يحدد عنوان عقاره بدقة على خريطة الـ Portal أو التطبيق، يكتبه إزاي؟',
        timestamp: 1788190000000
      },
      {
        id: 'msg_da_2',
        role: 'assistant',
        content: 'في حال عدم إمكانية تحديد العنوان على الخريطة بدقة:\n1. يختار الممول أقرب نقطة أو عقار مجاور على الخريطة.\n2. يظهر له خيار: "هل بيانات العنوان الواردة من الخريطة مطابقة لعنوان العقار محل الإقرار؟"، فيختار "لا".\n3. يحدد سبب عدم المطابقة، وحينها يُتاح له كتابة العنوان التفصيلي الصحيح يدوياً بجميع تفاصيله (المحافظة، الحي، الشارع، ورقم العقار).',
        status: 'verified',
        sources: [
          { topic: 'خطوات تحديد الموقع الجغرافي للعقار', source: 'دليل مستخدم البوابة الإلكترونية لمصلحة الضرائب العقارية' }
        ],
        followUps: ['الخدمات المخطط إتاحتها قريباً على البوابة'],
        timestamp: 1788190005000
      }
    ]
  },

  // 10. Gano Amir (Ext-Gano_Amir)
  {
    id: 'conv_official_gano_amir_1',
    ownerUid: 'emp_ext-gano_amir',
    ownerName: 'Gano Amir (جنى أمير)',
    ownerEmail: 'ext-gano_amir@tax.gov.eg',
    ownerUsername: 'Ext-Gano_Amir',
    department: 'مصلحة الضرائب العقارية - مركز الاتصال',
    jobTitle: 'Agent دعم واستشارات ضريبية',
    userId: 'emp_ext-gano_amir',
    userName: 'Gano Amir',
    title: 'شروط إعفاء مقرات الأحزاب والنقابات والجمعيات الأهلية',
    createdAt: 1788200000000,
    updatedAt: 1788202000000,
    messages: [
      {
        id: 'msg_ga_1',
        role: 'user',
        content: 'ما هي معايير إعفاء العقارات المملوكة للأحزاب السياسية والجمعيات الأهلية والنوادي؟',
        timestamp: 1788200000000
      },
      {
        id: 'msg_ga_2',
        role: 'assistant',
        content: 'تنص المادة (18) من القانون 196 لسنة 2008 على إعفاء:\n- العقارات المملوكة للأحزاب السياسية والنقابات المهنية والمنظمات العمالية المخصصة لممارسة نشاطها.\n- العقارات المملوكة للجمعيات والمؤسسات الأهلية الخاضعة للقانون المنظم لها والمخصصة لأغراضها.\n- أبنية مراكز الشباب والنوادي الرياضية المنشأة وفقاً للقوانين المنظمة للرياضة والمخصصة لأغراض الشباب.\nشرط الإعفاء أن تكون هذه المقار مستخدمة ومخصصة فعلياً في الأغراض غير الهادفة للربح الصادرة بشأنها الإعفاء.',
        status: 'verified',
        sources: [
          { topic: 'إعفاءات الهيئات والجمعيات والأحزاب', source: 'المادة 18 - بند (ب) و(ج) من قانون 196 لسنة 2008' }
        ],
        followUps: ['إعفاء دور العبادة والمقابر'],
        timestamp: 1788200005000
      }
    ]
  }
];
