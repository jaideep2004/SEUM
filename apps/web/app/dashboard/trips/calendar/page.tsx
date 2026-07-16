"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays, MapPin } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const STATUS_COLORS: Record<string,string> = {
  scheduled:"#3b82f6", en_route:"#10b981", completed:"#6b7280",
  cancelled:"#ef4444", delayed:"#f59e0b",
};

type ViewMode = "daily" | "weekly" | "monthly";

function getDaysInMonth(year:number,month:number){return new Date(year,month,0).getDate()}
function getFirstDayOfMonth(year:number,month:number){return new Date(year,month-1,1).getDay()}

export default function TripCalendarPage(){
  const router = useRouter();
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth()+1);
  const [trips,setTrips]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState<ViewMode>("monthly");

  useEffect(()=>{
    (async()=>{
      try{
        setLoading(true);
        const token=localStorage.getItem("seum_access_token");
        const res=await fetch(`${API}/operations/trips/calendar?month=${month}&year=${year}`,{headers:{Authorization:`Bearer ${token}`}});
        const data=await res.json();
        if(data.success) setTrips(data.data);
      }catch{}finally{setLoading(false)}
    })();
  },[month,year]);

  const daysInMonth=getDaysInMonth(year,month);
  const firstDay=getFirstDayOfMonth(year,month);

  const prevMonth=()=>{if(month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1)};
  const nextMonth=()=>{if(month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1)};

  return(
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Trip Calendar</h1>
          <p className={styles.pageDesc}>Monthly view of scheduled trips</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.viewToggle}>
            {(["daily","weekly","monthly"] as ViewMode[]).map(v=>(
              <button key={v} className={`${styles.viewBtn} ${view===v?styles.viewActive:""}`} onClick={()=>setView(v)}>
                {v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
          <div className={styles.monthNav}>
            <button className={styles.navBtn} onClick={prevMonth}><ChevronLeft size={18}/></button>
            <span className={styles.monthLabel}>{MONTHS[month-1]} {year}</span>
            <button className={styles.navBtn} onClick={nextMonth}><ChevronRight size={18}/></button>
          </div>
        </div>
      </div>

      {loading?(
        <div className={styles.loadingState}><div className={styles.spinner}/> Loading calendar...</div>
      ):trips.length===0?(
        <div className={styles.emptyState}>
          <CalendarDays size={48} style={{opacity:0.3}}/>
          <p>No trips for this month.</p>
        </div>
      ):(
        <div className={styles.calendarWrap}>
          <div className={styles.calendarGrid} style={{gridTemplateColumns:`140px repeat(${daysInMonth},minmax(60px,1fr))`}}>
            <div className={styles.busLabelCol}/>
            {Array.from({length:daysInMonth},(_,i)=>(
              <div key={i} className={styles.dayHeader}>
                <span className={styles.dayName}>{DAYS[(firstDay+i)%7]}</span>
                <span className={styles.dayNum}>{i+1}</span>
              </div>
            ))}
          </div>

          {/* Trips grouped by day */}
          <div className={styles.calendarGrid} style={{gridTemplateColumns:`140px repeat(${daysInMonth},minmax(60px,1fr))`}}>
            <div className={styles.busLabelCol}>
              <MapPin size={14} style={{color:"var(--color-text-tertiary)"}}/>
              <span className={styles.plateNumber}>All Trips</span>
            </div>
            {Array.from({length:daysInMonth},(_,dayIdx)=>{
              const dateStr=`${year}-${String(month).padStart(2,"0")}-${String(dayIdx+1).padStart(2,"0")}`;
              const dayTrips=trips.filter((t:any)=>t.scheduledDate===dateStr);
              return(
                <div key={dayIdx} className={styles.dayCell}>
                  {dayTrips.map((t:any)=>(
                    <div key={t.id} className={styles.tripBlock}
                      style={{background:STATUS_COLORS[t.status]||"#3b82f6"}}
                      onClick={()=>router.push(`/dashboard/trips/${t.id}`)}
                      title={`${t.routeName||"—"} (${t.scheduledStartTime?.slice(0,5)||""})`}
                    >
                      {t.scheduledStartTime?.slice(0,5)||""} {t.routeName||"—"}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
