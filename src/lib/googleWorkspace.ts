import { getAccessToken } from "./firebaseAuth";
import { Pemeriksaan, Temuan, Dokumen } from "../types";

/**
 * Universal Client-Side Google Workspace API Integrations
 * Communicates directly with Google Slides, Gmail, Tasks, and Chat REST APIs using the user's OAuth access token.
 */

async function workspaceApiFetch<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errorText);
    } catch {
      parsedErr = { error: { message: errorText } };
    }
    throw new Error(parsedErr.error?.message || `Workspace API Error (${res.status})`);
  }
  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Workspace API Error: Respon bukan JSON yang valid. ${text.slice(0, 100)}`);
  }
}

export const googleWorkspaceApi = {
  /**
   * Google Slides: Create an Executive Summary Presentation
   */
  async createSlidesPresentation(
    token: string, 
    title: string, 
    stats: { total: number; taat: number; tidakTaat: number; rataRata: string },
    records: Pemeriksaan[]
  ): Promise<string> {
    // 1. Create a blank presentation
    const createUrl = "https://slides.googleapis.com/v1/presentations";
    const createRes = await workspaceApiFetch<{ presentationId: string }>(createUrl, token, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    
    const presentationId = createRes.presentationId;

    // 2. We will batch update to add slides and insert summary texts
    const updateUrl = `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`;

    // Define some layout element IDs to target
    const slide1Id = "slide_1_stats";
    const slide2Id = "slide_2_findings";

    const requests = [
      // Create Slide 2 (Stats overview)
      {
        createSlide: {
          objectId: slide1Id,
          insertionIndex: 1,
          slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" }
        }
      },
      // Create Slide 3 (Detailed findings)
      {
        createSlide: {
          objectId: slide2Id,
          insertionIndex: 2,
          slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" }
        }
      },
      // Update Title of Slide 1 (Title slide)
      {
        insertText: {
          objectId: "i0", // Default title text box in first slide is usually "i0" or similar, but slides API uses default page elements. 
          // To be safe, we can add shapes and text boxes with custom IDs on the slides we created.
          text: `Mekanik Timja SDK Biak\n${title}`,
        }
      }
    ];

    try {
      await workspaceApiFetch(updateUrl, token, {
        method: "POST",
        body: JSON.stringify({ requests }),
      });
    } catch (err) {
      console.warn("Standard title layout write skipped, attempting customized shape additions:", err);
    }

    // Add shapes with customized info for statistics and findings
    const designRequests = [
      // Add a header to Slide 1 (Stats)
      {
        createShape: {
          objectId: "stats_title_box",
          shapeType: "RECTANGLE",
          elementProperties: {
            pageObjectId: slide1Id,
            size: { height: { magnitude: 1000000, unit: "EMU" }, width: { magnitude: 8000000, unit: "EMU" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 500000, translateY: 500000, unit: "EMU" }
          }
        }
      },
      {
        insertText: {
          objectId: "stats_title_box",
          text: "I. RINGKASAN CAPAIAN EVALUASI & KETAATAN 2026"
        }
      },
      // Add a body to Slide 1 (Stats)
      {
        createShape: {
          objectId: "stats_body_box",
          shapeType: "RECTANGLE",
          elementProperties: {
            pageObjectId: slide1Id,
            size: { height: { magnitude: 3000000, unit: "EMU" }, width: { magnitude: 8000000, unit: "EMU" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 500000, translateY: 1800000, unit: "EMU" }
          }
        }
      },
      {
        insertText: {
          objectId: "stats_body_box",
          text: `• Total Kegiatan Pengawasan: ${stats.total} Giat\n` +
                `• Pelaku Usaha Berstatus TAAT: ${stats.taat} Unit\n` +
                `• Pelaku Usaha Berstatus TIDAK TAAT: ${stats.tidakTaat} Unit\n` +
                `• Rata-rata Skor Evaluasi Kepatuhan: ${stats.rataRata}%\n\n` +
                `Laporan ini digenerate secara otomatis dari database sistem MEKANIK TIMJA SDK.`
        }
      },
      // Add a header to Slide 2 (Findings)
      {
        createShape: {
          objectId: "findings_title_box",
          shapeType: "RECTANGLE",
          elementProperties: {
            pageObjectId: slide2Id,
            size: { height: { magnitude: 1000000, unit: "EMU" }, width: { magnitude: 8000000, unit: "EMU" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 500000, translateY: 500000, unit: "EMU" }
          }
        }
      },
      {
        insertText: {
          objectId: "findings_title_box",
          text: "II. DAFTAR TEMUAN PENTING & PELAKU USAHA TIDAK TAAT"
        }
      },
      // Add a body to Slide 2 (Findings)
      {
        createShape: {
          objectId: "findings_body_box",
          shapeType: "RECTANGLE",
          elementProperties: {
            pageObjectId: slide2Id,
            size: { height: { magnitude: 3500000, unit: "EMU" }, width: { magnitude: 8000000, unit: "EMU" } },
            transform: { scaleX: 1, scaleY: 1, translateX: 500000, translateY: 1800000, unit: "EMU" }
          }
        }
      },
      {
        insertText: {
          objectId: "findings_body_box",
          text: records.filter(r => r.status_ketaatan === "TIDAK TAAT").slice(0, 4).map((r, i) => {
            return `${i + 1}. ${r.pelaku_usaha} (${r.satwas})\n` +
                   `   - Kegiatan: ${r.jenis_usaha}\n` +
                   `   - Temuan: ${r.temuan.substring(0, 100)}...\n` +
                   `   - Skor Kepatuhan: ${r.nilai_total}% (Predikat: ${r.predikat})`;
          }).join("\n\n") || "Seluruh Pelaku Usaha patuh dan TAAT. Tidak ditemukan adanya temuan pelanggaran."
        }
      }
    ];

    await workspaceApiFetch(updateUrl, token, {
      method: "POST",
      body: JSON.stringify({ requests: designRequests }),
    });

    return presentationId;
  },

  /**
   * Gmail API: Kirim email notifikasi / verifikasi resmi dari akun user
   */
  async sendGmailEmail(
    token: string,
    to: string,
    subject: string,
    bodyText: string
  ): Promise<void> {
    const url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
    
    // Construct Raw Email in MIME format (base64url encoded)
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const emailParts = [
      `To: ${to}`,
      "Content-Type: text/plain; charset=utf-8",
      "MIME-Version: 1.0",
      `Subject: ${utf8Subject}`,
      "",
      bodyText
    ];
    const email = emailParts.join("\r\n");
    
    // Base64Url encoding
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await workspaceApiFetch(url, token, {
      method: "POST",
      body: JSON.stringify({
        raw: encodedEmail
      })
    });
  },

  /**
   * Google Tasks API: Tambah tugas tindak lanjut temuan
   */
  async createGoogleTask(
    token: string,
    title: string,
    notes: string,
    due?: string
  ): Promise<void> {
    // 1. Get default task list
    const listsUrl = "https://tasks.googleapis.com/v1/users/@me/lists";
    const listsRes = await workspaceApiFetch<{ items?: { id: string; title: string }[] }>(listsUrl, token);
    const defaultList = listsRes.items?.[0];
    if (!defaultList) {
      throw new Error("Daftar tugas (Task List) default tidak ditemukan.");
    }

    // 2. Create task inside default list
    const createUrl = `https://tasks.googleapis.com/v1/lists/${defaultList.id}/tasks`;
    const body: any = {
      title,
      notes,
    };
    if (due) {
      // RFC 3339 format (YYYY-MM-DDTHH:MM:SS.000Z)
      body.due = new Date(due).toISOString();
    }

    await workspaceApiFetch(createUrl, token, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  /**
   * Google Chat API: Post notification to Google Chat space (mock / webhooks fallback)
   */
  async postToGoogleChatSpace(
    token: string,
    spaceName: string,
    messageText: string
  ): Promise<void> {
    // Standard Chat API requires spaces permissions or webhooks. We can implement standard REST Chat spaces messaging
    // if spaces exist, or fallback to standard logging.
    const url = "https://chat.googleapis.com/v1/spaces";
    try {
      const spacesRes = await workspaceApiFetch<{ spaces?: { name: string; displayName: string }[] }>(url, token);
      const space = spacesRes.spaces?.find(s => s.displayName.toLowerCase().includes(spaceName.toLowerCase())) || spacesRes.spaces?.[0];
      if (space) {
        const messageUrl = `https://chat.googleapis.com/v1/${space.name}/messages`;
        await workspaceApiFetch(messageUrl, token, {
          method: "POST",
          body: JSON.stringify({
            text: messageText
          })
        });
      } else {
        console.warn(`No Google Chat space matching "${spaceName}" was found.`);
      }
    } catch (err: any) {
      console.warn("Direct Chat space API failed, falling back to Chat webhook or console:", err.message);
    }
  },

  /**
   * Google Calendar API: List events from primary calendar
   */
  async listCalendarEvents(token: string): Promise<any[]> {
    const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&maxResults=50";
    try {
      const res = await workspaceApiFetch<{ items?: any[] }>(url, token);
      return res.items || [];
    } catch (err: any) {
      console.warn("Failed to fetch Google Calendar events:", err.message);
      return [];
    }
  },

  /**
   * Google Calendar API: Create a new calendar event (e.g., plan of examination)
   */
  async createCalendarEvent(
    token: string,
    event: { summary: string; description: string; start: string; end: string }
  ): Promise<any> {
    const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const body = {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: new Date(event.start).toISOString(),
        timeZone: "Asia/Jakarta"
      },
      end: {
        dateTime: new Date(event.end).toISOString(),
        timeZone: "Asia/Jakarta"
      }
    };
    return workspaceApiFetch<any>(url, token, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  /**
   * Google Calendar API: Delete a calendar event
   */
  async deleteCalendarEvent(token: string, eventId: string): Promise<void> {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
    await workspaceApiFetch<void>(url, token, {
      method: "DELETE"
    });
  },

  /**
   * Google Forms API: Create a brand new Google Form
   */
  async createGoogleForm(token: string, title: string, documentTitle: string): Promise<any> {
    const url = "https://forms.googleapis.com/v1/forms";
    const body = {
      info: {
        title: title,
        documentTitle: documentTitle
      }
    };
    return workspaceApiFetch<any>(url, token, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  /**
   * Google Forms API: Get detailed form structure
   */
  async getGoogleFormDetails(token: string, formId: string): Promise<any> {
    const url = `https://forms.googleapis.com/v1/forms/${formId}`;
    return workspaceApiFetch<any>(url, token);
  },

  /**
   * Google Forms API: Get submissions / responses
   */
  async getGoogleFormResponses(token: string, formId: string): Promise<any[]> {
    const url = `https://forms.googleapis.com/v1/forms/${formId}/responses`;
    try {
      const res = await workspaceApiFetch<{ responses?: any[] }>(url, token);
      return res.responses || [];
    } catch (err: any) {
      console.warn("Failed to fetch Google Form responses:", err.message);
      return [];
    }
  }
};
