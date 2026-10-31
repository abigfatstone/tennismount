export function normalizeLanguage(value) {
  const lang = String(value || "en").toLowerCase().replaceAll("_", "-").split("-")[0];
  return ["en", "zh", "ja", "ko", "es"].includes(lang) ? lang : "en";
}

const currentLanguage = () => normalizeLanguage(globalThis.window?.TM_I18N?.lang);
const cueIds = ["bh_late", "fh_late", "turn", "follow", "knees", "praise"];
const bank = (gentle, funny, strict) => Object.fromEntries(
  Object.entries({ gentle, funny, strict }).map(([persona, phrases]) => [persona, Object.fromEntries(cueIds.map((id, i) => [id, phrases[i]]))]),
);

export const translations = {
  en: {
    text: {
      bootloader: "bootloader", encoder: "encoder", align: "FOC alignment", planner: "planner", advertising: "BLE advertising", battery: "battery", link: "link iPhone ... connected", bootMode: "mode TRACK_",
      liveTitle: "LIVE NOW", liveSubtitle: "Crowdfunding is live", launchTag: "Crowdfunding live",
      modelError: "3D model could not load (please open via HTTP)", modeTrack: "MODE: TRACK", modeHome: "MODE: HOME",
      sprint: "EV   sprint! player → {side}", left: "LEFT", right: "RIGHT", targetLost: "EV   target lost → HOLD", targetAcquired: "EV   target re-acquired · score 0.81",
      baseline: "BASELINE", serviceLine: "SERVICE LINE", passer: "passer-by · ignored", lost: "LOST", locked: "LOCKED · YOU", mount: "MOUNT",
      controller: "EV   controller → {mode}", smartController: "TennisMount (α-β + τ + deadzone)", naiveController: "naive (raw error)", linkUp: "EV   link up · MTU 23 · interval 15 ms", tapLock: "EV   tap-to-lock → target acquired",
      invalidEmail: "ERR: invalid email · Please check the email format", sending: "> sending...", subscribeSuccess: "✓ 200 OK · Your {tier} place is reserved. We’ll notify you at launch.", subscribeError: "ERR: network · Submission failed. Please try again later.", subscribeStorageError: "ERR: storage · Your browser could not save your interest. Please allow local storage and try again.", subscribePreview: "✓ Interest saved ({tier}). Preview only: the subscription service is not connected. Your email is stored only in this browser on this device; no notification has been scheduled.",
    },
    labels: ["Late backhand preparation", "Late forehand preparation", "More shoulder turn", "Complete the follow-through", "Lower your center of gravity", "Five great shots in a row"],
    lines: bank(
      [["Try preparing your backhand a little earlier", "Turn and take the racket back as you see the ball", "Give your backhand time to get ready"], ["Prepare your forehand a little earlier", "Take the racket back sooner for more time", "Try an earlier takeback on the next shot"], ["A little more shoulder turn will help", "Try turning your back toward the net", "Let your shoulder turn do some of the work"], ["Let your follow-through go a little further", "Finish with your racket above your shoulder", "Send the racket through after contact"], ["Bend your knees a little for balance", "A lower center of gravity will feel steadier", "Try getting a little lower"], ["Those were lovely shots", "Great rhythm, keep it going", "You’re getting more consistent"]],
      [["Is your backhand still checking its calendar?", "The ball clocked out before your backhand arrived", "Backhand says: I’m not ready yet!"], ["Is your forehand waiting for a dinner invitation?", "The ball is here and your takeback is still loading", "Prepare early, the ball won’t wait"], ["Turn those shoulders, you’re not a robot", "Your body would like to join the rally too", "Less arm-only tennis, more shoulder turn"], ["Where did the follow-through go? Sudden brakes!", "Finish over your shoulder, no early exits", "Finish that swing, don’t be shy"], ["Your knees have hinges, give them a try", "This is tennis, not standing guard", "A little lower, the court won’t bite"], ["Nice! Have you been practicing in secret?", "Full marks for that shot", "You’re putting your coach out of a job"]],
      [["Backhand preparation is late", "Turn earlier on the backhand", "Backhand, prepare early!"], ["Forehand preparation is late", "Take the racket back early", "Forehand, earlier!"], ["Not enough shoulder turn", "Turn your shoulders more", "Use your body!"], ["Incomplete follow-through", "Finish over your shoulder", "Follow through!"], ["Center of gravity is too high", "Bend your knees", "Get lower!"], ["Good, maintain it", "Technique on point", "Keep it up"]],
    ),
  },
  zh: {
    text: {
      bootloader: "启动程序", encoder: "编码器", align: "FOC 对齐", planner: "运动规划器", advertising: "BLE 广播", battery: "电池", link: "连接 iPhone ... 已连接", bootMode: "模式：跟拍_",
      liveTitle: "现已上线", liveSubtitle: "众筹已上线", launchTag: "众筹进行中",
      modelError: "3D 模型加载失败（需通过 http 访问）", modeTrack: "模式：跟拍", modeHome: "模式：归位",
      sprint: "EV   冲刺！球员 → {side}", left: "左", right: "右", targetLost: "EV   目标丢失 → 保持", targetAcquired: "EV   重新锁定目标 · 置信度 0.81",
      baseline: "底线", serviceLine: "发球线", passer: "路人 · 已忽略", lost: "目标丢失", locked: "已锁定 · 你", mount: "支架",
      controller: "EV   控制器 → {mode}", smartController: "TennisMount（α-β + τ + 死区）", naiveController: "朴素控制（原始偏差）", linkUp: "EV   连接建立 · MTU 23 · 间隔 15 ms", tapLock: "EV   点击锁定 → 已获取目标",
      invalidEmail: "ERR: 邮箱无效 · 请检查邮箱格式", sending: "> 正在提交...", subscribeSuccess: "✓ 200 OK · 已锁定 {tier} 资格，上线时第一时间通知你。", subscribeError: "ERR: 网络错误 · 提交失败，请稍后再试", subscribeStorageError: "ERR: 存储失败 · 浏览器无法保存意向，请允许本地存储后重试。", subscribePreview: "✓ 已记下你的意向（{tier}）。预览版：订阅服务尚未接入，邮箱只保存在你这台设备的浏览器里，不会自动发送通知。",
    },
    labels: ["反手引拍晚", "正手准备晚", "转肩不够", "随挥不完整", "重心太高", "连续 5 拍很好"],
    lines: bank(
      [["反手再早一点点就完美了", "看到球就转身拉拍", "反手别着急，先准备"], ["正手可以早点准备哦", "拍子早点拉开会更从容", "下一拍早一点引拍试试"], ["肩膀再转多一点哦", "试试把背转给球网", "转肩会更省力"], ["随挥可以再长一点", "拍子收到肩膀上面", "打完把拍子送出去"], ["膝盖稍微弯一点更稳哦", "重心放低会更舒服", "试试蹲低一点"], ["这几拍好棒", "节奏很好，继续", "越来越稳了"]],
      [["反手在思考人生吗？", "反手慢半拍，球已下班", "反手：我还没准备好！"], ["正手又在等球请吃饭？", "球都到了你才想起拉拍", "早点引拍，球不等人"], ["转肩！你又不是机器人", "肩膀转起来，别光甩手", "身体也想参与一下"], ["随挥呢？刹车太急了", "拍子送到肩上，别半路下车", "挥完它，别害羞"], ["腿是借来的吗？弯一下", "你在打网球不是站岗", "低一点，再低一点"], ["可以啊，偷偷练过？", "这拍我给满分", "教练要失业了"]],
      [["反手引拍晚", "反手提前转身", "反手，早准备！"], ["正手准备晚了", "提前引拍", "正手，早！"], ["转肩不够", "多转肩", "用身体打球！"], ["随挥不完整", "收拍过肩", "随挥！"], ["重心太高", "屈膝", "降重心！"], ["很好，保持", "动作到位", "继续保持"]],
    ),
  },
  ja: {
    text: {
      bootloader: "ブートローダー", encoder: "エンコーダー", align: "FOC 位置合わせ", planner: "動作プランナー", advertising: "BLE アドバタイズ", battery: "バッテリー", link: "iPhone 接続 ... 接続済み", bootMode: "モード：追尾_",
      liveTitle: "公開中", liveSubtitle: "クラウドファンディング開始", launchTag: "クラウドファンディング実施中",
      modelError: "3D モデルを読み込めません（HTTP 経由で開いてください）", modeTrack: "モード：追尾", modeHome: "モード：原点復帰",
      sprint: "EV   ダッシュ！選手 → {side}", left: "左", right: "右", targetLost: "EV   対象を見失いました → 保持", targetAcquired: "EV   対象を再捕捉 · 信頼度 0.81",
      baseline: "ベースライン", serviceLine: "サービスライン", passer: "通行人 · 無視", lost: "ロスト", locked: "ロック中 · あなた", mount: "マウント",
      controller: "EV   制御方式 → {mode}", smartController: "TennisMount（α-β + τ + 不感帯）", naiveController: "単純制御（未補正の誤差）", linkUp: "EV   接続完了 · MTU 23 · 間隔 15 ms", tapLock: "EV   タップでロック → 対象を捕捉",
      invalidEmail: "ERR: メールアドレスの形式を確認してください", sending: "> 送信中...", subscribeSuccess: "✓ 200 OK · {tier} の枠を確保しました。公開時にお知らせします。", subscribeError: "ERR: 通信エラー · 送信に失敗しました。後でもう一度お試しください。", subscribeStorageError: "ERR: 保存できませんでした。ブラウザーのローカル保存を許可して再試行してください。", subscribePreview: "✓ ご希望を保存しました（{tier}）。プレビュー版：登録サービスは未接続です。メールアドレスはこの端末のブラウザー内にのみ保存され、通知は送信されません。",
    },
    labels: ["バックハンドの準備が遅い", "フォアハンドの準備が遅い", "肩の回転が足りない", "フォロースルーを最後まで", "重心を低く", "5 球連続でナイスショット"],
    lines: bank(
      [["バックハンドはもう少し早く準備しましょう", "ボールが見えたら体を回してラケットを引きましょう"], ["フォアハンドは少し早めに準備しましょう", "早めにラケットを引くと余裕ができますよ"], ["肩をもう少し回してみましょう", "背中をネットに向けるイメージです"], ["フォロースルーをもう少し長くしましょう", "ラケットを肩の上まで振り抜きましょう"], ["膝を少し曲げると安定しますよ", "重心を少し低くしてみましょう"], ["今のラリー、とてもよかったです", "いいリズムです、その調子"]],
      [["バックハンド、まだ考え事してる？", "ボールはもう退勤、バックハンドは遅刻です"], ["フォアハンド、ボールの招待状を待ってる？", "ボール到着、テイクバックはまだ準備中！"], ["肩も参加したがっていますよ", "ロボットじゃないんだから、肩を回そう！"], ["フォロースルー、急ブレーキは禁止！", "肩まで振ろう、途中下車しないでね"], ["膝の関節、使ってみませんか？", "テニス中ですよ、見張り番じゃありません"], ["おや、こっそり練習しましたね？", "このままだとコーチは失業です"]],
      [["バックハンドの準備が遅い", "バックハンドは早く体を回す！"], ["フォアハンドの準備が遅い", "早くラケットを引く！"], ["肩の回転が足りない", "体を使って打つ！"], ["フォロースルーが不十分", "肩の上まで振り抜く！"], ["重心が高い", "膝を曲げる！"], ["よし、維持しよう", "いい動作だ、そのまま続けよう"]],
    ),
  },
  ko: {
    text: {
      bootloader: "부트로더", encoder: "인코더", align: "FOC 정렬", planner: "동작 플래너", advertising: "BLE 광고", battery: "배터리", link: "iPhone 연결 ... 연결됨", bootMode: "모드: 추적_",
      liveTitle: "지금 공개", liveSubtitle: "크라우드펀딩이 시작되었습니다", launchTag: "크라우드펀딩 진행 중",
      modelError: "3D 모델을 불러오지 못했습니다 (HTTP로 접속해 주세요)", modeTrack: "모드: 추적", modeHome: "모드: 원점 복귀",
      sprint: "EV   전력 질주! 선수 → {side}", left: "왼쪽", right: "오른쪽", targetLost: "EV   대상 놓침 → 유지", targetAcquired: "EV   대상 재포착 · 신뢰도 0.81",
      baseline: "베이스라인", serviceLine: "서비스라인", passer: "지나가는 사람 · 무시됨", lost: "대상 놓침", locked: "추적 중 · 나", mount: "마운트",
      controller: "EV   제어기 → {mode}", smartController: "TennisMount (α-β + τ + 데드존)", naiveController: "단순 제어 (원시 오차)", linkUp: "EV   연결됨 · MTU 23 · 간격 15 ms", tapLock: "EV   탭하여 잠금 → 대상 포착",
      invalidEmail: "ERR: 이메일 형식을 확인해 주세요", sending: "> 전송 중...", subscribeSuccess: "✓ 200 OK · {tier} 신청이 예약되었습니다. 출시 시 알려드릴게요.", subscribeError: "ERR: 네트워크 · 전송하지 못했습니다. 잠시 후 다시 시도해 주세요.", subscribeStorageError: "ERR: 저장 실패 · 브라우저의 로컬 저장을 허용한 뒤 다시 시도해 주세요.", subscribePreview: "✓ 관심을 저장했습니다 ({tier}). 미리보기: 구독 서비스가 아직 연결되지 않았습니다. 이메일은 이 기기의 브라우저에만 저장되며 알림은 발송되지 않습니다.",
    },
    labels: ["늦은 백핸드 준비", "늦은 포핸드 준비", "어깨 회전 부족", "팔로스루 끝까지", "무게중심 낮추기", "5회 연속 좋은 샷"],
    lines: bank(
      [["백핸드를 조금만 더 일찍 준비해 보세요", "공이 보이면 몸을 돌려 라켓을 빼세요"], ["포핸드를 조금 일찍 준비해 보세요", "라켓을 일찍 빼면 더 여유로워져요"], ["어깨를 조금 더 돌려 보세요", "등이 네트를 향하도록 돌아 보세요"], ["팔로스루를 조금 더 길게 해 보세요", "라켓을 어깨 위까지 보내 주세요"], ["무릎을 살짝 굽히면 더 안정적이에요", "무게중심을 조금 낮춰 보세요"], ["방금 몇 번의 샷, 정말 좋았어요", "리듬이 좋아요, 계속해 보세요"]],
      [["백핸드가 아직 인생 고민 중인가요?", "공은 벌써 퇴근했는데 백핸드는 지각이네요"], ["포핸드가 공의 초대장을 기다리나요?", "공은 도착했는데 테이크백은 로딩 중!"], ["어깨도 경기에 참여하고 싶대요", "로봇 아니잖아요, 어깨를 돌려요!"], ["팔로스루에 급브레이크는 금지!", "어깨까지 가세요, 중간 하차는 안 돼요"], ["무릎에 관절이 있다는 걸 기억해요", "테니스 중이지 보초 서는 거 아니에요"], ["몰래 연습한 거 아니에요?", "이러다 코치가 실직하겠어요"]],
      [["백핸드 준비가 늦다", "백핸드는 몸을 일찍 돌려!"], ["포핸드 준비가 늦다", "라켓을 미리 빼!"], ["어깨 회전이 부족하다", "몸을 써서 쳐!"], ["팔로스루가 짧다", "어깨 위까지 마무리!"], ["무게중심이 높다", "무릎을 굽혀!"], ["좋아, 유지해", "동작 좋다, 계속해"]],
    ),
  },
  es: {
    text: {
      bootloader: "cargador de arranque", encoder: "codificador", align: "alineación FOC", planner: "planificador", advertising: "anuncio BLE", battery: "batería", link: "enlace iPhone ... conectado", bootMode: "modo SEGUIMIENTO_",
      liveTitle: "YA DISPONIBLE", liveSubtitle: "La campaña de financiación está activa", launchTag: "Campaña en marcha",
      modelError: "No se pudo cargar el modelo 3D (abre la página mediante HTTP)", modeTrack: "MODO: SEGUIMIENTO", modeHome: "MODO: INICIO",
      sprint: "EV   ¡esprint! jugador → {side}", left: "IZQUIERDA", right: "DERECHA", targetLost: "EV   objetivo perdido → MANTENER", targetAcquired: "EV   objetivo recuperado · confianza 0.81",
      baseline: "LÍNEA DE FONDO", serviceLine: "LÍNEA DE SERVICIO", passer: "transeúnte · ignorado", lost: "PERDIDO", locked: "FIJADO · TÚ", mount: "SOPORTE",
      controller: "EV   controlador → {mode}", smartController: "TennisMount (α-β + τ + zona muerta)", naiveController: "simple (error sin corregir)", linkUp: "EV   conectado · MTU 23 · intervalo 15 ms", tapLock: "EV   tocar para fijar → objetivo adquirido",
      invalidEmail: "ERR: correo no válido · Revisa el formato del correo", sending: "> enviando...", subscribeSuccess: "✓ 200 OK · Tu plaza {tier} está reservada. Te avisaremos en el lanzamiento.", subscribeError: "ERR: red · No se pudo enviar. Inténtalo de nuevo más tarde.", subscribeStorageError: "ERR: almacenamiento · El navegador no pudo guardar tu interés. Permite el almacenamiento local e inténtalo de nuevo.", subscribePreview: "✓ Interés guardado ({tier}). Solo vista previa: el servicio de suscripción no está conectado. Tu correo se guarda únicamente en el navegador de este dispositivo; no se ha programado ninguna notificación.",
    },
    labels: ["Preparación tardía del revés", "Preparación tardía de derecha", "Más giro de hombros", "Completa la terminación", "Baja el centro de gravedad", "Cinco buenos golpes seguidos"],
    lines: bank(
      [["Prepara el revés un poquito antes", "Gira y lleva la raqueta atrás al ver la pelota"], ["Prepara la derecha un poco antes", "Llevar antes la raqueta atrás te dará más tiempo"], ["Prueba a girar un poco más los hombros", "Imagina que das la espalda a la red"], ["Alarga un poco la terminación del golpe", "Termina con la raqueta por encima del hombro"], ["Flexiona un poco las rodillas para estar más estable", "Prueba a bajar un poco el centro de gravedad"], ["Esos golpes han estado muy bien", "Buen ritmo, sigue así"]],
      [["¿Tu revés sigue pensando en la vida?", "La pelota ya se fue y tu revés sigue llegando"], ["¿Tu derecha espera una invitación a cenar?", "La pelota ya llegó y tu preparación sigue cargando"], ["¡Gira los hombros, que no eres un robot!", "Tu cuerpo también quiere participar en el punto"], ["¿Y la terminación? ¡Nada de frenar en seco!", "Lleva la raqueta al hombro, sin bajarte antes"], ["Las rodillas se doblan, por si se te olvidaba", "Esto es tenis, no una guardia de pie"], ["¡Vaya! ¿Has entrenado a escondidas?", "Así vas a dejar al entrenador sin trabajo"]],
      [["Preparación del revés tardía", "¡Gira antes para el revés!"], ["Preparación de derecha tardía", "¡Lleva la raqueta atrás antes!"], ["Falta giro de hombros", "¡Usa el cuerpo al golpear!"], ["Terminación incompleta", "¡Termina por encima del hombro!"], ["Centro de gravedad demasiado alto", "¡Flexiona las rodillas!"], ["Bien, mantenlo", "Buena técnica, sigue así"]],
    ),
  },
};

export function runtimeText(key, params = {}, lang = currentLanguage()) {
  const text = translations[normalizeLanguage(lang)].text[key] ?? translations.en.text[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
}

export function coachContent(lang = currentLanguage()) {
  const content = translations[normalizeLanguage(lang)];
  return { cues: cueIds.map((id, i) => [id, content.labels[i]]), lines: content.lines };
}

export function speechLocale(lang = currentLanguage()) {
  return { en: "en-US", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR", es: "es-ES" }[normalizeLanguage(lang)];
}

export function selectVoice(voices, lang = currentLanguage()) {
  const locale = speechLocale(lang).toLowerCase();
  const normalized = (voice) => voice.lang.toLowerCase().replaceAll("_", "-");
  return voices.find((voice) => normalized(voice) === locale)
    ?? voices.find((voice) => normalized(voice).split("-")[0] === locale.split("-")[0]);
}

export function nextPhraseIndex(length, previous, random = Math.random()) {
  const index = Math.floor(random * length);
  return length > 1 && index === previous ? (index + 1) % length : index;
}
