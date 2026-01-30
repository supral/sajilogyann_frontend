// src/components/OfficeFileViewer.jsx
import React, { useState, useEffect, useRef } from 'react';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Add custom scrollbar styles
const scrollbarStyles = `
  .office-viewer-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .office-viewer-scroll::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 10px;
  }
  .office-viewer-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }
  .office-viewer-scroll::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = scrollbarStyles;
  if (!document.getElementById('office-viewer-scrollbar-styles')) {
    styleSheet.id = 'office-viewer-scrollbar-styles';
    document.head.appendChild(styleSheet);
  }
}

const OfficeFileViewer = ({ fileUrl, fileName }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useEmbed, setUseEmbed] = useState(false);
  const [slides, setSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const loadFile = async () => {
      if (!fileUrl) return;
      
      setLoading(true);
      setError(null);
      setContent(null);
      setSlides([]);
      setCurrentSlideIndex(0);
      
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to fetch file');
        
        const arrayBuffer = await response.arrayBuffer();
        const ext = fileName?.toLowerCase().split('.').pop() || fileUrl.toLowerCase().split('.').pop();
        
        if (ext === 'docx' || ext === 'doc') {
          // Convert DOCX to HTML using mammoth
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setContent(result.value);
            if (result.messages.length > 0) {
              console.warn('Mammoth warnings:', result.messages);
            }
          } catch (mammothError) {
            console.error('Mammoth conversion error:', mammothError);
            setError('Failed to convert document. Trying alternative method...');
            setUseEmbed(true);
          }
        } else if (ext === 'pptx' || ext === 'ppt') {
          // For PPTX, try to extract and render slides
          try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            const extractedSlides = [];
            let slideIndex = 1;
            
            // PPTX structure: ppt/slides/slide1.xml, slide2.xml, etc.
            while (true) {
              const slidePath = `ppt/slides/slide${slideIndex}.xml`;
              if (!zip.files[slidePath]) break;
              
              const slideXml = await zip.files[slidePath].async('string');
              
              // Extract text from slide XML - get all text nodes
              const textMatches = slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
              const paragraphs = [];
              
              textMatches.forEach(match => {
                const text = match.replace(/<[^>]*>/g, '').trim();
                if (text && text.length > 0) {
                  paragraphs.push(text);
                }
              });
              
              extractedSlides.push({ 
                index: slideIndex, 
                xml: slideXml,
                paragraphs: paragraphs
              });
              slideIndex++;
            }
            
            if (extractedSlides.length > 0) {
              setSlides(extractedSlides);
              setCurrentSlideIndex(0);
            } else {
              setError('No slides found in presentation');
              setUseEmbed(true);
            }
          } catch (pptxError) {
            console.error('PPTX parsing error:', pptxError);
            setError('Failed to parse PowerPoint file. Trying alternative method...');
            setUseEmbed(true);
          }
        } else if (ext === 'xlsx' || ext === 'xls') {
          // For Excel, use embed/object tag
          setUseEmbed(true);
        } else {
          setError('Unsupported file type');
          setUseEmbed(true);
        }
      } catch (err) {
        console.error('Error loading file:', err);
        setError(err.message || 'Failed to load file');
        setUseEmbed(true);
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [fileUrl, fileName]);

  const ext = fileName?.toLowerCase().split('.').pop() || fileUrl?.toLowerCase().split('.').pop();

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
        <p>Loading file...</p>
      </div>
    );
  }

  // Use embed/object for files that couldn't be converted or for Excel
  if (useEmbed || (error && !content)) {
    if (ext === 'pptx' || ext === 'ppt') {
      return (
        <div style={{ width: '100%', height: '600px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <iframe
            src={fileUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="PowerPoint Presentation"
          />
        </div>
      );
    }
    
    if (ext === 'xlsx' || ext === 'xls') {
      return (
        <div style={{ width: '100%', height: '600px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <iframe
            src={fileUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Excel Spreadsheet"
          />
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
          <p>{error}</p>
          <a
            href={fileUrl}
            download
            style={{
              display: 'inline-block',
              marginTop: '20px',
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '600'
            }}
          >
            📥 Download File
          </a>
        </div>
      );
    }
  }

  // For PPTX files with slides, show one slide at a time with navigation
  if (slides.length > 0) {
    const currentSlide = slides[currentSlideIndex];
    const canGoPrevious = currentSlideIndex > 0;
    const canGoNext = currentSlideIndex < slides.length - 1;

    const renderSlideContent = (slide) => {
      if (!slide.paragraphs || slide.paragraphs.length === 0) {
        return (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ margin: 0 }}>This slide contains images or complex formatting that cannot be displayed inline.</p>
            <p style={{ margin: '10px 0 0', fontSize: '14px' }}>Please download the file to view the full presentation.</p>
          </div>
        );
      }

      return (
        <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
          {slide.paragraphs.map((para, idx) => {
            // Check if it looks like a heading (short, might be title)
            if (para.length < 100 && !para.includes('.')) {
              return (
                <h3 key={idx} style={{ color: '#1e293b', margin: idx === 0 ? '0 0 20px' : '20px 0 10px', fontSize: '24px', fontWeight: '700', textAlign: 'center' }}>
                  {para}
                </h3>
              );
            } else {
              return (
                <p key={idx} style={{ margin: '12px 0', lineHeight: '1.8', color: '#334155', fontSize: '16px', textAlign: 'left' }}>
                  {para}
                </p>
              );
            }
          })}
        </div>
      );
    };

    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '15px', padding: '12px', background: '#f8fafc', borderRadius: '8px', flexShrink: 0 }}>
          <h2 style={{ margin: '0 0 5px', color: '#1e293b', fontSize: '16px' }}>{fileName || 'Presentation'}</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{slides.length} slide(s)</p>
        </div>

        {/* Slide Content Area - Only Current Slide, Scrollable if content is long */}
        <div
          ref={containerRef}
          style={{
            width: '100%',
            minHeight: '500px',
            maxHeight: 'calc(100vh - 380px)',
            padding: '40px',
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '15px',
            flex: '1 1 auto'
          }}
          className="office-viewer-scroll"
        >
          {/* Slide Content - Only render current slide */}
          {renderSlideContent(currentSlide)}
        </div>

        {/* Slide Navigation Buttons - Bottom (duplicate for convenience) */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 15px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '8px',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
        }}>
          <button
            onClick={() => {
              if (canGoPrevious) {
                setCurrentSlideIndex(prev => Math.max(0, prev - 1));
                if (containerRef.current) {
                  containerRef.current.scrollTop = 0;
                }
              }
            }}
            disabled={!canGoPrevious}
            style={{
              padding: '10px 20px',
              background: canGoPrevious ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: canGoPrevious ? '2px solid rgba(255, 255, 255, 0.5)' : '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              cursor: canGoPrevious ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: '600',
              opacity: canGoPrevious ? 1 : 0.5,
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              if (canGoPrevious) {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (canGoPrevious) {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'scale(1)';
              }
            }}
          >
            ← Previous
          </button>

          <div style={{ 
            color: 'white', 
            fontSize: '16px', 
            fontWeight: '700',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            padding: '8px 20px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            Slide {currentSlideIndex + 1} of {slides.length}
          </div>

          <button
            onClick={() => {
              if (canGoNext) {
                setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
                if (containerRef.current) {
                  containerRef.current.scrollTop = 0;
                }
              }
            }}
            disabled={!canGoNext}
            style={{
              padding: '10px 20px',
              background: canGoNext ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: canGoNext ? '2px solid rgba(255, 255, 255, 0.5)' : '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: '600',
              opacity: canGoNext ? 1 : 0.5,
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              if (canGoNext) {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (canGoNext) {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'scale(1)';
              }
            }}
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  // For DOCX files with converted content, display the HTML
  if (content) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          minHeight: '400px',
          maxHeight: 'calc(100vh - 400px)',
          padding: '20px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return null;
};

export default OfficeFileViewer;
