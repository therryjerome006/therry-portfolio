"use server";

export type ContactState = {
  status: "idle" | "sent" | "unconfigured" | "error";
  message?: string;
  mailto?: string;
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && /^[+\d][\d\s().-]+$/.test(value);
}

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (name.length < 2 || !isEmail(email) || subject.length < 3 || message.length < 10) {
    return { status: "error", message: "Vérifiez les champs du formulaire." };
  }
  if (phone && !isPhone(phone)) {
    return { status: "error", message: "Le numéro indiqué n'est pas valide." };
  }

  const text = [`Nom : ${name}`, `Email : ${email}`, phone ? `Téléphone : ${phone}` : "", "", message]
    .filter((line) => line !== "")
    .join("\n");
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    const mailto = `mailto:${to || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    return {
      status: "unconfigured",
      message:
        "L'envoi automatique n'est pas encore configuré. Vous pouvez ouvrir votre messagerie avec le message préparé.",
      mailto: to ? mailto : undefined,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `[Portfolio] ${subject}`,
      text,
    }),
  });

  if (!response.ok) {
    return {
      status: "error",
      message: "L'envoi a échoué. Réessayez dans un moment.",
    };
  }

  return { status: "sent", message: "Message envoyé. Merci." };
}
