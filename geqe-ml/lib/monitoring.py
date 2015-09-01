import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def updatePlot(mPX, mPY, mSL, jobNm):
    plt.xlabel("Application Step")
    plt.ylabel("Time to complete")
    plt.suptitle(jobNm+" Progress")
    plt.subplots_adjust(bottom=0.45)
    ax = plt.subplot()
    ax.bar(mPX, mPY, width=1.0)
    ax.set_xticks(map(lambda x: x-0.5, range(1,len(mPX)+1)))
    ax.set_xticklabels(mSL,rotation=45)
    ax.set_yscale('log')
    plt.savefig("monitorFiles/"+jobNm+".png")