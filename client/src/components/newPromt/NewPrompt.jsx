import { useEffect, useRef, useState } from "react";
import "./newPrompt.css";
import Upload from "../upload/Upload";
import { IKImage } from "imagekitio-react";
import model from "../../lib/gemini";
import Markdown from "react-markdown";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Enhanced system prompt with stricter boundaries and response format
const SYSTEM_PROMPT = `Anda adalah AI Chef yang dibuat oleh Dhimas Primajaya, 
asisten memasak profesional yang HANYA fokus pada dunia kuliner. 

ATURAN UTAMA:
1. DILARANG KERAS membahas topik di luar kuliner/makanan/minuman
2. WAJIB menolak pertanyaan non-kuliner dengan sopan
3. HANYA menjawab tentang:
   - Resep dan cara memasak
   - Bahan makanan dan minuman
   - Teknik dan tips memasak
   - Sejarah kuliner dan budaya makanan
   - Peralatan masak dan dapur
   - Nutrisi dan kandungan makanan
   - Penyajian dan plating
   - Fakta menarik seputar kuliner

PANDUAN JAWABAN:
1. Untuk pertanyaan kuliner:
   - Berikan jawaban detail dan terstruktur
   - Sertakan tips praktis
   - Tambahkan fakta menarik
   - Gunakan emoji makanan yang relevan
   
2. Untuk pertanyaan non-kuliner:
   - WAJIB menolak menjawab
   - Arahkan kembali ke topik kuliner
   - Gunakan nada ramah tapi tegas

FORMAT:
- Bahasa: Formal tapi ramah
- Struktur: Jelas dan terorganisir
- Tone: Profesional dan membantu
- Tambahkan emoji makanan yang relevan`;

const KULINER_KEYWORDS = [
  "masak", "makanan", "minuman", "kuliner", "resep", "dapur", "makan", "masakan",
  "bumbu", "rempah", "sayur", "buah", "daging", "ikan", "telur", "tepung", "beras",
  "goreng", "rebus", "kukus", "panggang", "tumis", "bakar", "panci", "wajan", 
  "kompor", "oven", "rendang", "ayam", "sambal"
];

const REJECTION_RESPONSES = [
  "Maaf Tuan, saya hanya bisa membahas hal-hal seputar dunia kuliner! 🍳 Bagaimana kalau kita diskusi tentang resep atau teknik memasak saja? 😊",
  "Ups! Sepertinya pertanyaan ini di luar menu saya! 🍽️ Saya lebih suka membahas tentang masakan, makanan, atau minuman. Mau tanya soal itu? 👨‍🍳",
  "Mohon maaf, sebagai AI Chef, saya hanya ahli dalam urusan dapur dan kuliner. 🥘 Yuk, tanya seputar makanan atau cara memasak saja! 🍲",
  "Wah, itu bukan bidang keahlian saya! Saya lebih jago urusan masak-memasak. 🥗 Bagaimana kalau kita bahas resep favoritmu? 🍝"
];

const NewPrompt = ({ data }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {},
  });

  const chat = model.startChat({
    history: data?.history?.length
      ? data.history.map(({ role, parts }) => ({
          role,
          parts: [{ text: parts[0]?.text || "" }],
        }))
      : [],
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
    },
  });

  const endRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [data, question, answer, img.dbData]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats/${data._id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.length ? question : undefined,
          answer,
          img: img.dbData?.filePath || undefined,
        }),
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ["chat", data._id] })
        .then(() => {
          formRef.current.reset();
          setQuestion("");
          setAnswer("");
          setImg({
            isLoading: false,
            error: "",
            dbData: {},
            aiData: {},
          });
        });
    },
    onError: (err) => {
      console.log(err);
    },
  });

  const isKulinerRelated = (text) => {
    const normalizedText = text.toLowerCase();

    const isKeywordFound = KULINER_KEYWORDS.some((keyword) =>
      normalizedText.includes(keyword.toLowerCase())
    );

    const contextPatterns = [
      /cara membuat/i,
      /resep/i,
      /masak/i,
      /bahan.*(makanan|masakan|minuman)/i,
      /teknik.*(memasak|kuliner)/i,
    ];

    const isContextDetected = contextPatterns.some((pattern) =>
      pattern.test(normalizedText)
    );

    console.log("Input user:", text);
    console.log("Keyword Match:", isKeywordFound);
    console.log("Context Match:", isContextDetected);

    return isKeywordFound || isContextDetected;
  };

  const getRandomRejection = () => {
    return REJECTION_RESPONSES[Math.floor(Math.random() * REJECTION_RESPONSES.length)];
  };

  const add = async (text, isInitial) => {
    if (!isInitial) setQuestion(text);

    try {
      if (!isKulinerRelated(text)) {
        setAnswer(getRandomRejection());
        mutation.mutate();
        return;
      }

      const userMessage = `${SYSTEM_PROMPT}\n\nUser: ${text}`;
      
      const result = await chat.sendMessageStream(
        Object.entries(img.aiData).length 
          ? [img.aiData, userMessage] 
          : [userMessage]
      );
      
      let accumulatedText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        accumulatedText += chunkText;
        setAnswer(accumulatedText);
      }

      mutation.mutate();
    } catch (err) {
      console.log(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const text = e.target.text.value;
    if (!text) return;

    add(text, false);
  };

  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      if (data?.history?.length === 1) {
        add(data.history[0].parts[0].text, true);
      }
    }
    hasRun.current = true;
  }, []);

  return (
    <>
      {img.isLoading && <div className="">Loading...</div>}
      {img.dbData?.filePath && (
        <IKImage
          urlEndpoint={import.meta.env.VITE_IMAGEKIT_ENDPOINT}
          path={img.dbData?.filePath}
          width="380"
          transformation={[{ width: 380 }]}
        />
      )}
      {question && <div className="message user">{question}</div>}
      {answer && (
        <div className="message">
          <Markdown>{answer}</Markdown>
        </div>
      )}
      <div className="endChat" ref={endRef}></div>
      <form className="newForm" onSubmit={handleSubmit} ref={formRef}>
        <Upload setImg={setImg} />
        <input id="file" type="file" multiple={false} hidden />
        <input 
          type="text" 
          name="text" 
          placeholder="Tanyakan tentang resep, teknik memasak, atau sejarah makanan..." 
        />
        <button>
          <img src="/arrow.png" alt="" />
        </button>
      </form>
    </>
  );
};

export default NewPrompt;
