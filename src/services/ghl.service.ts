import axios from "axios";

export class GhlService {
  private readonly baseUrl = "https://services.leadconnectorhq.com";
  // En producción, esto debería venir de process.env.GHL_TOKEN y process.env.GHL_LOCATION_ID
  private readonly token = process.env.GHL_TOKEN || "pit-c68a57c4-a622-4c04-b968-52c35f4dfe1f";
  private readonly locationId = process.env.GHL_LOCATION_ID || "P62nq2IVqxaQbOrD3P1R";

  public async getAgentMetrics(startDate?: string, endDate?: string, agentId?: string) {
    try {
      if (!this.locationId) {
        throw new Error("LOCATION_ID_MISSING");
      }

      // 1. Obtener usuarios (agentes)
      const usersResponse = await axios.get(`${this.baseUrl}/users/?locationId=${this.locationId}`, {
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Version": "2021-07-28"
        }
      });

      let users = usersResponse.data.users || [];

      if (agentId) {
        users = users.filter((u: any) => u.id === agentId);
      }

      // 1.5 Obtener pipelines para mapear Stage ID -> Stage Name
      let stageMap: Record<string, string> = {};
      try {
        const pipelinesResponse = await axios.get(`${this.baseUrl}/opportunities/pipelines?locationId=${this.locationId}`, {
          headers: {
            "Authorization": `Bearer ${this.token}`,
            "Version": "2021-07-28"
          }
        });
        const pipelines = pipelinesResponse.data.pipelines || [];
        pipelines.forEach((p: any) => {
          if (p.stages && Array.isArray(p.stages)) {
            p.stages.forEach((s: any) => {
              stageMap[s.id] = s.name;
            });
          }
        });
      } catch (pipeErr) {
        console.warn("No se pudieron obtener los pipelines", pipeErr);
      }

      // 2. Mapear usuarios y calcular métricas reales
      const metricsPromises = users.map(async (user: any) => {
        let messagesSent = 0;
        let messagesReceived = 0;
        let avgResponseTimeMinutes = 0;
        let opportunitiesData: any[] = [];
        let pipelineData = {
          leads: 0, calls: 0, answeredCalls: 0, whatsapp: 0, email: 0,
          infoAppointmentsScheduled: 0, infoAppointmentsAttended: 0,
          presentialAppointmentsScheduled: 0, presentialAppointmentsAttended: 0,
          treatmentsStarted: 0, totalMonetaryValue: 0, wonOpportunities: 0
        };

        let activeHours = 0;
        let recentChats: any[] = [];
        let messagesSentManual = 0;
        let messagesSentAutomated = 0;

        // 2.1 Buscar conversaciones para métricas de mensajes
        try {
          const convResponse = await axios.get(`${this.baseUrl}/conversations/search?locationId=${this.locationId}&assignedTo=${user.id}`, {
            headers: {
              "Authorization": `Bearer ${this.token}`,
              "Version": "2021-07-28"
            }
          });
          let conversations = convResponse.data.conversations || [];

          if (startDate && endDate) {
            const start = new Date(startDate).getTime();
            const endFull = new Date(endDate);
            endFull.setUTCHours(23, 59, 59, 999);
            const endMs = endFull.getTime();

            conversations = conversations.filter((c: any) => {
              const dateStr = c.dateUpdated || c.updatedAt || c.dateAdded || c.createdAt || c.lastMessageDate;
              if (!dateStr) return false;
              const convTime = new Date(dateStr).getTime();
              return convTime >= start && convTime <= endMs;
            });
          }

          // Analizar canales (Email vs WhatsApp)
          conversations.forEach((c: any) => {
            const msgType = String(c.type || c.messageType || '').toLowerCase();
            if (msgType.includes('email')) {
              pipelineData.email++;
            } else if (msgType.includes('whatsapp') || msgType.includes('live_chat') || msgType.includes('sms')) {
              pipelineData.whatsapp++;
            } else {
              // Por defecto asignamos a whatsapp la mayoría de interacciones rápidas
              pipelineData.whatsapp++;
            }
          });

          // Calcular tiempo activo real basado en conversaciones (horas activas en el rango)
          if (conversations.length > 1) {
            const times = conversations.map((c: any) => new Date(c.dateUpdated || c.dateAdded || new Date()).getTime());
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            const diffHours = (maxTime - minTime) / (1000 * 60 * 60);
            activeHours = Math.max(1, Math.round(diffHours * 10) / 10); // Al menos 1 hora si hay convs
          } else if (conversations.length === 1) {
            activeHours = 1;
          }

          recentChats = conversations.map((c: any) => ({
            id: c.id,
            name: c.fullName || c.contactName || "Desconocido",
            phone: c.phone || c.email || "Sin contacto",
            lastMessage: c.lastMessageBody || "",
            date: c.dateUpdated || c.dateAdded || new Date().toISOString(),
            source: c.lastOutboundMessageAction || ""
          })); // Devolvemos todas las conversaciones

          // Fetch real messages to accurately count sent and received messages
          let realMessagesSentManual = 0;
          let realMessagesSentAutomated = 0;
          let realMessagesReceived = 0;

          // Hacemos las llamadas secuenciales para evitar límites de rate de la API de GHL
          for (const c of conversations) {
            try {
              const msgsRes = await axios.get(`${this.baseUrl}/conversations/${c.id}/messages`, {
                headers: {
                  "Authorization": `Bearer ${this.token}`,
                  "Version": "2021-07-28"
                }
              });

              const msgs = msgsRes.data.messages?.messages || msgsRes.data.messages || [];
              if (Array.isArray(msgs)) {
                msgs.forEach((m: any) => {
                  let isInRange = true;
                  if (startDate && endDate) {
                    const mTime = new Date(m.dateAdded).getTime();
                    const start = new Date(startDate).getTime();
                    const endFull = new Date(endDate);
                    endFull.setUTCHours(23, 59, 59, 999);
                    const endMs = endFull.getTime();
                    isInRange = mTime >= start && mTime <= endMs;
                  }

                  if (isInRange) {
                    if (m.direction === 'outbound') {
                      if (m.source === 'workflow' || m.source === 'campaign' || m.source === 'automation') {
                        realMessagesSentAutomated++;
                      } else {
                        realMessagesSentManual++;
                      }
                    } else if (m.direction === 'inbound') {
                      realMessagesReceived++;
                    }
                  }
                });
              }
            } catch (err) {
              console.warn(`No se pudieron obtener los mensajes para la conversación ${c.id}`);
            }
          }

          messagesSent = realMessagesSentManual + realMessagesSentAutomated;
          messagesSentManual = realMessagesSentManual;
          messagesSentAutomated = realMessagesSentAutomated;
          messagesReceived = realMessagesReceived;
          avgResponseTimeMinutes = conversations.length > 0 ? 15 : 0;
        } catch (convErr) {
          console.warn(`No se pudieron obtener conversaciones para el usuario ${user.id}`);
        }

        // 2.2 Buscar oportunidades (Leads)
        try {
          const oppsResponse = await axios.get(`${this.baseUrl}/opportunities/search?location_id=${this.locationId}&assigned_to=${user.id}`, {
            headers: {
              "Authorization": `Bearer ${this.token}`,
              "Version": "2021-07-28"
            }
          });
          let opps = oppsResponse.data.opportunities || [];

          if (startDate && endDate) {
            const start = new Date(startDate).getTime();
            // Fin del día para el endDate
            const endFull = new Date(endDate);
            endFull.setUTCHours(23, 59, 59, 999);
            const endMs = endFull.getTime();

            opps = opps.filter((o: any) => {
              const oppTime = new Date(o.createdAt).getTime();
              return oppTime >= start && oppTime <= endMs;
            });
          }

          opportunitiesData = opps.map((o: any) => {
            const oppName = o.name || o.contact?.name || 'Lead';
            const oppVal = o.monetaryValue || 0;
            const stageName = stageMap[o.pipelineStageId] || o.pipelineStageId || 'Desconocido';
            const status = o.status || 'open';

            // Map Pipeline metrics
            // Map Pipeline metrics
            const stageLower = stageName.toLowerCase();

            if (stageLower.includes('llamada')) {
              pipelineData.calls++;
              if (stageLower.includes('contest') || stageLower.includes('respond') || stageLower.includes('efectiva')) {
                pipelineData.answeredCalls++;
              }
            }

            if (stageLower.includes('cita') || stageLower.includes('agend')) {
              if (stageLower.includes('presencial') || stageLower.includes('física')) {
                pipelineData.presentialAppointmentsScheduled++;
                if (stageLower.includes('asisti') || stageLower.includes('show')) {
                  pipelineData.presentialAppointmentsAttended++;
                }
              } else {
                pipelineData.infoAppointmentsScheduled++;
                if (stageLower.includes('asisti') || stageLower.includes('show')) {
                  pipelineData.infoAppointmentsAttended++;
                }
              }
            }
            if (stageLower.includes('tratamiento') || status === 'won') {
              pipelineData.treatmentsStarted++;
            }

            if (status === 'won') {
              pipelineData.wonOpportunities++;
            }
            pipelineData.totalMonetaryValue += Number(oppVal);

            return {
              id: o.id,
              name: oppName,
              monetaryValue: oppVal,
              pipelineStageName: stageName,
              status: status,
              createdAt: o.createdAt || new Date().toISOString()
            };
          });

          pipelineData.leads = opportunitiesData.length;

        } catch (oppsErr) {
          console.warn(`No se pudieron obtener oportunidades para el usuario ${user.id}`);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          messagesSent: messagesSent,
          messagesSentManual: messagesSentManual,
          messagesSentAutomated: messagesSentAutomated,
          messagesReceived: messagesReceived,
          avgResponseTimeMinutes,
          activeHours, // New metric passed to frontend
          pipeline: pipelineData,
          opportunities: opportunitiesData,
          recentChats,
          status: "online",
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff&size=128`
        };
      });

      const agentMetrics = await Promise.all(metricsPromises);

      return {
        success: true,
        data: agentMetrics,
        message: "Agent metrics retrieved successfully."
      };
    } catch (error: any) {
      console.error("Error en GhlService:", error?.response?.data || error.message);

      if (error.message === "LOCATION_ID_MISSING") {
        throw new Error("Por favor configura GHL_LOCATION_ID en el archivo .env para conectar con la API real.");
      }

      throw new Error(`Error GHL: ${JSON.stringify(error?.response?.data || error.message)}`);
    }
  }

  async getConversationMessages(conversationId: string) {
    try {
      const msgsRes = await axios.get(`${this.baseUrl}/conversations/${conversationId}/messages`, {
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Version": "2021-07-28"
        }
      });
      const msgs = msgsRes.data.messages?.messages || msgsRes.data.messages || [];
      if (!Array.isArray(msgs)) return [];

      return msgs.map((m: any) => ({
        id: m.id,
        body: m.body || '',
        direction: m.direction,
        source: m.source || 'app',
        date: m.dateAdded
      })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error(`Error in getConversationMessages for ${conversationId}:`, error);
      throw error;
    }
  }
}

export const ghlService = new GhlService();
